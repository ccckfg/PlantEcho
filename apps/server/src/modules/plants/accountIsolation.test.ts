import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("plant, device and sync data are scoped by account owner", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/account-isolation-${randomUUID()}`;
  process.env.PROACTIVE_ENABLED = "false";

  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const { registerUser } = await import("../auth/authService.js");
  const { claimDevice, getClaimedDevices, registerPendingDevice } = await import("../devices/deviceService.js");
  const { listSyncEventsSince } = await import("../sync/syncRepository.js");
  const { createPlant, getPlant, listPlants } = await import("./plantRepository.js");

  try {
    await migrate();
    const alpha = await registerUser({ username: "alpha_owner", password: "garden-pass-1" });
    const beta = await registerUser({ username: "beta_owner", password: "garden-pass-2" });

    const alphaPlant = await createPlant({
      userId: alpha.user.id,
      name: "Alpha Plant",
      species: "绿萝"
    });
    const betaPlant = await createPlant({
      userId: beta.user.id,
      name: "Beta Plant",
      species: "薄荷"
    });

    const alphaPlantIds = (await listPlants(alpha.user.id)).map((plant) => plant.id);
    const betaPlantIds = (await listPlants(beta.user.id)).map((plant) => plant.id);
    assert.equal(alphaPlantIds.includes(alphaPlant.id), true);
    assert.equal(alphaPlantIds.includes(betaPlant.id), false);
    assert.deepEqual(betaPlantIds, [betaPlant.id]);
    assert.equal(await getPlant(betaPlant.id, false, alpha.user.id), null);

    const alphaDeviceId = `esp32-alpha-${randomUUID()}`;
    await registerPendingDevice(alphaDeviceId, { capturedAt: new Date().toISOString(), userId: alpha.user.id });
    await claimDevice(alphaDeviceId, {
      mode: "existingPlant",
      plantId: alphaPlant.id,
      deviceName: "Alpha Sensor"
    }, alpha.user);

    assert.equal((await getClaimedDevices(alpha.user)).some((device) => device.id === alphaDeviceId), true);
    assert.equal((await getClaimedDevices(beta.user)).some((device) => device.id === alphaDeviceId), false);

    const alphaEvents = await listSyncEventsSince(0, 50, alpha.user.id);
    const betaEvents = await listSyncEventsSince(0, 50, beta.user.id);

    assert.equal(alphaEvents.some((event) => event.plantId === alphaPlant.id), true);
    assert.equal(betaEvents.some((event) => event.plantId === alphaPlant.id), false);
  } finally {
    await closeDb();
  }
});
