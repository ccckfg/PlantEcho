import assert from "node:assert/strict";
import test from "node:test";
import { defaultCareProfile } from "../../config/careProfiles.js";
import { getDb } from "../../db/connection.js";
import { migrate } from "../../db/migrate.js";
import { createPlant } from "../plants/plantRepository.js";
import type { SensorReading } from "../readings/types.js";
import { observeBodyReading, type BodyTriggerOptions } from "./bodyTriggers.js";

const options: BodyTriggerOptions = {
  alpha: 0.5,
  persistenceMs: 12 * 60 * 60_000,
  maxGapMs: 7 * 60 * 60_000,
  expiryMs: 2 * 24 * 60 * 60_000
};

const reading = (
  plantId: string,
  capturedAt: Date,
  soilPercent: number,
  id: number
): SensorReading => ({
  id,
  deviceId: `body-device-${plantId}`,
  plantId,
  capturedAt: capturedAt.toISOString(),
  soilRaw: null,
  soilPercent,
  airTempC: 24,
  airHumidityPercent: 55,
  lightLux: 1_200,
  rssi: -50,
  batteryMv: null,
  createdAt: capturedAt.toISOString()
});

const intentionRows = (plantId: string) => getDb().prepare(
  "SELECT source_id, status FROM plant_intentions WHERE plant_id = ? AND source_type = 'sensor'"
).all<{ source_id: string; status: string }>(plantId);

test("an instantaneous body anomaly does not enter the intention pool", async () => {
  await migrate();
  const plant = await createPlant({ name: "瞬时波动", species: "绿萝" });
  try {
    const now = new Date();
    await observeBodyReading(plant.id, reading(plant.id, now, 10, 1), defaultCareProfile, options);
    assert.equal((await intentionRows(plant.id)).length, 0);
  } finally {
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  }
});

test("a continuous EWMA anomaly upserts one body intention and recovery dismisses it", async () => {
  await migrate();
  const plant = await createPlant({ name: "持续干燥", species: "绿萝" });
  try {
    const base = new Date(Date.now() - 13 * 60 * 60_000);
    const atHour = (hours: number) => new Date(base.getTime() + hours * 60 * 60_000);
    await observeBodyReading(plant.id, reading(plant.id, atHour(0), 10, 1), defaultCareProfile, options);
    await observeBodyReading(plant.id, reading(plant.id, atHour(6), 10, 2), defaultCareProfile, options);
    assert.equal((await intentionRows(plant.id)).length, 0);
    await observeBodyReading(plant.id, reading(plant.id, atHour(12), 10, 3), defaultCareProfile, options);
    await observeBodyReading(plant.id, reading(plant.id, atHour(13), 10, 4), defaultCareProfile, options);

    const sustained = await intentionRows(plant.id);
    assert.equal(sustained.length, 1);
    assert.match(sustained[0].source_id, /^body:soil_percent:soil_low:/);
    assert.equal(sustained[0].status, "pending");

    await observeBodyReading(plant.id, reading(plant.id, atHour(14), 60, 5), defaultCareProfile, options);
    assert.equal((await intentionRows(plant.id))[0].status, "dismissed");
  } finally {
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  }
});
