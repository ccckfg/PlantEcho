import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { normalizeReadingPayload } from "@dyn/shared";
import type { DeviceConfigPayload } from "../iot/deviceConfigTypes.js";

test("unknown device becomes pending, then claimed device requires its generated key", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/device-claim-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { getDb, closeDb } = await import("../../db/connection.js");
  const { latestSchemaVersion } = await import("../../db/migrations/index.js");
  const { env } = await import("../../config/env.js");
  const { insertReading } = await import("../readings/readingRepository.js");
  const { registerDeviceConfigPublisher } = await import("../iot/deviceConfigChannel.js");
  const {
    claimDevice,
    applyBulkDeviceAction,
    deleteDevice,
    confirmDeviceCredentialsDelivered,
    deliverPendingDeviceConfig,
    getClaimedDevices,
    getPendingDevices,
    hasPendingDeviceCredentials,
    ignorePendingDevice,
    isAuthorizedDevice,
    registerPendingDevice,
    setDeviceEnabled
  } = await import("./deviceService.js");

  const countReadings = async (deviceId: string): Promise<number> => {
    const row = await getDb()
      .prepare("SELECT COUNT(*) AS count FROM sensor_readings WHERE device_id = ?")
      .get(deviceId) as { count: number };
    return row.count;
  };

  await migrate();
  const schemaVersion = await getDb()
    .prepare("SELECT MAX(version) AS version FROM schema_migrations")
    .get() as { version: number };
  assert.equal(schemaVersion.version, latestSchemaVersion);
  const deviceId = `test-device-${randomUUID()}`;
  const payload = {
    capturedAt: new Date().toISOString(),
    soilRaw: 2200,
    soilPercent: 50,
    airTempC: 24.5,
    airHumidityPercent: 55,
    lightLux: 900,
    rssi: -58,
    batteryMv: null
  };

  try {
    const delivered: Array<{ deviceId: string; payload: DeviceConfigPayload }> = [];
    const blockedDeliveries = new Set<string>();
    registerDeviceConfigPublisher((targetDeviceId, config) => {
      if (blockedDeliveries.has(targetDeviceId)) return false;
      delivered.push({ deviceId: targetDeviceId, payload: config });
      return true;
    });

    const pending = await registerPendingDevice(deviceId, payload);
    assert.equal(pending.id, deviceId);
    assert.equal(pending.userId, null);
    assert.equal(pending.claimStatus, "pending");
    assert.equal(await countReadings(deviceId), 0);

    const scopedId = `test-device-${randomUUID()}`;
    const scoped = await registerPendingDevice(scopedId, { ...payload, userId: "user-a" });
    assert.equal(scoped.userId, "user-a");
    assert.equal((await getPendingDevices("user-a")).some((device) => device.id === scopedId), true);
    assert.equal((await getPendingDevices("user-b")).some((device) => device.id === scopedId), false);
    await assert.rejects(() => ignorePendingDevice(scopedId, "user-b"), /not found/);
    const scopedIgnored = await ignorePendingDevice(scopedId, "user-a");
    assert.equal(scopedIgnored.claimStatus, "ignored");

    const usernameScopedId = `test-device-${randomUUID()}`;
    const usernameScoped = await registerPendingDevice(usernameScopedId, { ...payload, userId: "ccckfg" });
    assert.equal(usernameScoped.userId, "ccckfg");
    assert.equal(
      (await getPendingDevices({ id: "user-id-1", username: "ccckfg" })).some((device) => device.id === usernameScopedId),
      true
    );
    assert.equal(
      (await getPendingDevices({ id: "user-id-2", username: "other" })).some((device) => device.id === usernameScopedId),
      false
    );

    const ignoredId = `test-device-${randomUUID()}`;
    await registerPendingDevice(ignoredId, payload);
    assert.equal((await getPendingDevices()).some((device) => device.id === ignoredId), true);
    const ignored = await ignorePendingDevice(ignoredId);
    assert.equal(ignored.claimStatus, "ignored");
    assert.equal((await getPendingDevices()).some((device) => device.id === ignoredId), false);

    const queuedId = `test-device-${randomUUID()}`;
    await registerPendingDevice(queuedId, payload);
    blockedDeliveries.add(queuedId);
    const queuedClaim = await claimDevice(queuedId, {
      mode: "existingPlant",
      plantId: env.DEFAULT_PLANT_ID,
      deviceName: "Queued ESP32"
    });
    assert.equal(queuedClaim.deliveredToDevice, false);
    assert.equal(await hasPendingDeviceCredentials(queuedId), true);
    assert.equal(await isAuthorizedDevice(queuedId, queuedClaim.deviceApiKey), true);
    blockedDeliveries.delete(queuedId);
    assert.equal(await deliverPendingDeviceConfig(queuedId), true);
    const queuedDelivery = delivered.find((item) => item.deviceId === queuedId);
    assert.equal(queuedDelivery?.payload.apiKey, queuedClaim.deviceApiKey);
    assert.equal(await hasPendingDeviceCredentials(queuedId), true);
    await confirmDeviceCredentialsDelivered(queuedId);
    assert.equal(await hasPendingDeviceCredentials(queuedId), false);

    const claimed = await claimDevice(deviceId, {
      mode: "existingPlant",
      plantId: env.DEFAULT_PLANT_ID,
      deviceName: "Test ESP32"
    });

    assert.equal(claimed.device.id, deviceId);
    assert.equal(claimed.device.plantId, env.DEFAULT_PLANT_ID);
    assert.equal(claimed.device.hasApiKey, true);
    assert.match(claimed.deviceApiKey, /^dyn_dev_/);
    assert.equal(claimed.deliveredToDevice, true);
    const mainDelivery = delivered.find((item) => item.deviceId === deviceId);
    assert.equal(mainDelivery?.payload.apiKey, claimed.deviceApiKey);
    assert.equal((await getClaimedDevices()).some((device) => device.id === deviceId), true);
    assert.equal(await isAuthorizedDevice(deviceId), false);
    assert.equal(await isAuthorizedDevice(deviceId, "wrong"), false);
    assert.equal(await isAuthorizedDevice(deviceId, claimed.deviceApiKey), true);

    const disabled = await setDeviceEnabled(deviceId, false);
    assert.equal(disabled.status, "disabled");
    assert.equal(await isAuthorizedDevice(deviceId, claimed.deviceApiKey), false);
    const enabled = await setDeviceEnabled(deviceId, true);
    assert.equal(enabled.status, "active");
    assert.equal(await isAuthorizedDevice(deviceId, claimed.deviceApiKey), true);

    await insertReading(deviceId, env.DEFAULT_PLANT_ID, normalizeReadingPayload(payload));
    assert.equal(await countReadings(deviceId), 1);

    const deleted = await deleteDevice(deviceId);
    assert.equal(deleted.status, "deleted");
    assert.equal((await getClaimedDevices()).some((device) => device.id === deviceId), false);
    const restored = await applyBulkDeviceAction({ deviceIds: [deviceId], action: "enable" });
    assert.equal(restored.devices[0]?.status, "active");
  } finally {
    registerDeviceConfigPublisher(null);
    await closeDb();
  }
});
