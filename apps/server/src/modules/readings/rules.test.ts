import assert from "node:assert/strict";
import test from "node:test";
import { defaultCareProfile } from "../../config/careProfiles.js";
import { evaluateReading } from "./rules.js";
import type { SensorReading } from "./types.js";

test("evaluateReading flags dry soil", () => {
  const reading: SensorReading = {
    id: 1,
    deviceId: "d1",
    plantId: "p1",
    capturedAt: new Date().toISOString(),
    soilRaw: 2000,
    soilPercent: 20,
    airTempC: 24,
    airHumidityPercent: 55,
    lightLux: 1200,
    rssi: -50,
    batteryMv: null,
    createdAt: new Date().toISOString()
  };
  const summary = evaluateReading(defaultCareProfile, reading);
  assert.equal(summary.overall, "watch");
  assert.equal(summary.issues[0]?.code, "soil_low");
});

test("evaluateReading treats stale readings as offline instead of current facts", () => {
  const now = new Date("2026-05-25T10:00:00.000Z");
  const reading: SensorReading = {
    id: 2,
    deviceId: "d1",
    plantId: "p1",
    capturedAt: "2026-05-25T09:55:00.000Z",
    soilRaw: 2000,
    soilPercent: 4,
    airTempC: 22.6,
    airHumidityPercent: 71,
    lightLux: 4,
    rssi: -50,
    batteryMv: null,
    createdAt: "2026-05-25T09:55:00.000Z"
  };

  const summary = evaluateReading(defaultCareProfile, reading, now);

  assert.equal(summary.overall, "risk");
  assert.equal(summary.issues[0]?.code, "sensor_offline");
  assert.equal(summary.facts.some((fact) => fact.includes("土壤湿度 4%")), false);
  assert.equal(summary.facts.some((fact) => fact.includes("光照 4 lux")), false);
  assert.equal(summary.facts.some((fact) => fact.includes("不要使用最后一次读数")), true);
});
