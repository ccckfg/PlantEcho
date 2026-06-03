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
    getClaimedDevices,
    getPendingDevices,
    ignorePendingDevice,
    isAuthorizedDevice,
    registerPendingDevice,
    setDeviceEnabled
  } = await import("./deviceService.js");

  const countReadings = (deviceId: string): number => {
    const row = getDb()
      .prepare("SELECT COUNT(*) AS count FROM sensor_readings WHERE device_id = ?")
      .get(deviceId) as { count: number };
    return row.count;
  };

  migrate();
  const schemaVersion = getDb()
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
    registerDeviceConfigPublisher((targetDeviceId, config) => {
      delivered.push({ deviceId: targetDeviceId, payload: config });
      return true;
    });

    const pending = registerPendingDevice(deviceId, payload);
    assert.equal(pending.id, deviceId);
    assert.equal(pending.userId, null);
    assert.equal(pending.claimStatus, "pending");
    assert.equal(countReadings(deviceId), 0);

    const scopedId = `test-device-${randomUUID()}`;
    const scoped = registerPendingDevice(scopedId, { ...payload, userId: "user-a" });
    assert.equal(scoped.userId, "user-a");
    assert.equal(getPendingDevices("user-a").some((device) => device.id === scopedId), true);
    assert.equal(getPendingDevices("user-b").some((device) => device.id === scopedId), false);
    assert.throws(() => ignorePendingDevice(scopedId, "user-b"), /not found/);
    const scopedIgnored = ignorePendingDevice(scopedId, "user-a");
    assert.equal(scopedIgnored.claimStatus, "ignored");

    const ignoredId = `test-device-${randomUUID()}`;
    registerPendingDevice(ignoredId, payload);
    assert.equal(getPendingDevices().some((device) => device.id === ignoredId), true);
    const ignored = ignorePendingDevice(ignoredId);
    assert.equal(ignored.claimStatus, "ignored");
    assert.equal(getPendingDevices().some((device) => device.id === ignoredId), false);

    const claimed = claimDevice(deviceId, {
      mode: "existingPlant",
      plantId: env.DEFAULT_PLANT_ID,
      deviceName: "Test ESP32"
    });

    assert.equal(claimed.device.id, deviceId);
    assert.equal(claimed.device.plantId, env.DEFAULT_PLANT_ID);
    assert.equal(claimed.device.hasApiKey, true);
    assert.match(claimed.deviceApiKey, /^dyn_dev_/);
    assert.equal(claimed.deliveredToDevice, true);
    assert.equal(delivered[0]?.deviceId, deviceId);
    assert.equal(delivered[0]?.payload.apiKey, claimed.deviceApiKey);
    assert.equal(getClaimedDevices().some((device) => device.id === deviceId), true);
    assert.equal(isAuthorizedDevice(deviceId), false);
    assert.equal(isAuthorizedDevice(deviceId, "wrong"), false);
    assert.equal(isAuthorizedDevice(deviceId, claimed.deviceApiKey), true);

    const disabled = setDeviceEnabled(deviceId, false);
    assert.equal(disabled.status, "disabled");
    assert.equal(isAuthorizedDevice(deviceId, claimed.deviceApiKey), false);
    const enabled = setDeviceEnabled(deviceId, true);
    assert.equal(enabled.status, "active");
    assert.equal(isAuthorizedDevice(deviceId, claimed.deviceApiKey), true);

    insertReading(deviceId, env.DEFAULT_PLANT_ID, normalizeReadingPayload(payload));
    assert.equal(countReadings(deviceId), 1);

    const deleted = deleteDevice(deviceId);
    assert.equal(deleted.status, "deleted");
    assert.equal(getClaimedDevices().some((device) => device.id === deviceId), false);
    const restored = applyBulkDeviceAction({ deviceIds: [deviceId], action: "enable" });
    assert.equal(restored.devices[0]?.status, "active");
  } finally {
    registerDeviceConfigPublisher(null);
    closeDb();
  }
});
