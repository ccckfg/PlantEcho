import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const sampleReading = (soilPercent: number) => ({
  capturedAt: new Date().toISOString(),
  soilRaw: 2200,
  soilPercent,
  airTempC: 24,
  airHumidityPercent: 55,
  lightLux: 900,
  rssi: -58,
  batteryMv: null
});

test("multi-plant device readings stay isolated across claim, status and sync events", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/multi-plant-${randomUUID()}`;
  process.env.PROACTIVE_ENABLED = "false";

  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const { createPlant, getPlant } = await import("../plants/plantRepository.js");
  const { getPlantStatus } = await import("../plants/statusRepository.js");
  const { getPlantReadingState, getPlantReadings, recordDeviceReading } = await import("../readings/readingService.js");
  const { listSyncEventsSince } = await import("../sync/syncRepository.js");
  const { claimDevice, isAuthorizedDevice, registerPendingDevice } = await import("./deviceService.js");

  try {
    migrate();
    const existingPlant = createPlant({ name: "小竹", species: "文竹", location: "窗边" });
    const existingDeviceId = `esp32-existing-${randomUUID()}`;
    const newDeviceId = `esp32-new-${randomUUID()}`;

    registerPendingDevice(existingDeviceId, sampleReading(41));
    const existingClaim = claimDevice(existingDeviceId, {
      mode: "existingPlant",
      plantId: existingPlant.id,
      deviceName: "文竹传感器"
    });

    registerPendingDevice(newDeviceId, sampleReading(62));
    const newClaim = claimDevice(newDeviceId, {
      mode: "newPlant",
      plant: { name: "小薄荷", species: "薄荷", location: "厨房窗台" },
      deviceName: "薄荷传感器"
    });

    assert.equal(isAuthorizedDevice(existingDeviceId, existingClaim.deviceApiKey), true);
    assert.equal(isAuthorizedDevice(newDeviceId, newClaim.deviceApiKey), true);

    const dryReading = recordDeviceReading(existingDeviceId, sampleReading(8));
    const wetReading = recordDeviceReading(newDeviceId, sampleReading(96));

    assert.equal(dryReading.plantId, existingPlant.id);
    assert.equal(wetReading.plantId, newClaim.device.plantId);
    assert.equal(getPlantReadingState(existingPlant.id).latest?.deviceId, existingDeviceId);
    assert.equal(getPlantReadingState(newClaim.device.plantId).latest?.deviceId, newDeviceId);
    assert.equal(getPlantReadings(existingPlant.id).length, 1);
    assert.equal(getPlantReadings(newClaim.device.plantId).length, 1);
    assert.match(getPlantStatus(existingPlant.id)?.focus ?? "", /土壤偏干/);
    assert.match(getPlantStatus(newClaim.device.plantId)?.focus ?? "", /土壤偏湿/);
    assert.equal(getPlant(newClaim.device.plantId)?.name, "小薄荷");

    const events = listSyncEventsSince(0, 50);
    assert.equal(events.some((event) => event.type === "plants.changed" && event.plantId === newClaim.device.plantId), true);
    assert.equal(events.filter((event) => event.type === "readings.changed").length, 2);
  } finally {
    closeDb();
  }
});
