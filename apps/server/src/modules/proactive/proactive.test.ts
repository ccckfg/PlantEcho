import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { migrate } from "../../db/migrate.js";
import { getDb } from "../../db/connection.js";
import { createPlant } from "../plants/plantRepository.js";
import { insertClaimedDevice } from "../devices/deviceRepository.js";
import { getPlantReadingState, recordDeviceReading } from "../readings/readingService.js";
import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { getSensorTrust } from "../readings/sensorTrust.js";
import { detectReminderPlan } from "./reminderDetector.js";
import { createReminder, getReminder } from "./reminderRepository.js";
import { runReminderJob } from "./reminderJob.js";
import type { BackgroundJob } from "../jobs/jobTypes.js";

const flushAsyncTasks = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const cleanup = (plantId: string): void => {
  const db = getDb();
  db.prepare("DELETE FROM background_jobs WHERE payload_json LIKE ?").run(`%${plantId}%`);
  db.prepare("DELETE FROM plants WHERE id = ?").run(plantId);
};

test("stable low soil transition emits only one proactive assistant message", async () => {
  migrate();
  const plant = createPlant({ name: "测试小绿", species: "绿萝" });
  const deviceId = `test-proactive-${randomUUID()}`;
  insertClaimedDevice(deviceId, plant.id, "Test ESP32", "hash");
  try {
    const payload = {
      capturedAt: new Date().toISOString(),
      soilRaw: 3200,
      soilPercent: 5,
      airTempC: 24,
      airHumidityPercent: 55,
      lightLux: 800,
      rssi: -50,
      batteryMv: null
    };
    recordDeviceReading(deviceId, payload);
    recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString(), soilRaw: 3300 });
    recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString(), soilRaw: 3400 });
    recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString(), soilRaw: 3500 });
    await flushAsyncTasks();

    const events = getDb()
      .prepare("SELECT COUNT(*) AS count FROM proactive_event_log WHERE plant_id = ? AND event_type = ?")
      .get(plant.id, "sensor.soil_low") as { count: number };
    const messages = getDb()
      .prepare("SELECT COUNT(*) AS count FROM messages WHERE plant_id = ? AND role = 'assistant'")
      .get(plant.id) as { count: number };
    assert.equal(events.count, 1);
    assert.equal(messages.count, 1);

    recordDeviceReading(deviceId, {
      ...payload,
      capturedAt: new Date().toISOString(),
      soilPercent: 50
    });
    await flushAsyncTasks();
    const observation = getDb()
      .prepare("SELECT event_key FROM proactive_observation_state WHERE plant_id = ?")
      .get(plant.id);
    assert.equal(observation, undefined);
  } finally {
    cleanup(plant.id);
  }
});

test("user statement that sensor data is unreal suppresses sensor speech", async () => {
  migrate();
  const plant = createPlant({ name: "桌上传感器", species: "绿萝" });
  const deviceId = `test-untrusted-${randomUUID()}`;
  insertClaimedDevice(deviceId, plant.id, "Test ESP32", "hash");
  try {
    addMessage(
      plant.id,
      nextTurn(plant.id),
      "user",
      "传感器没有插在土里，只是放在桌上，这些数据不真实。"
    );
    assert.equal(getSensorTrust(plant.id).trusted, false);
    assert.equal(getPlantReadingState(plant.id).sensorTrust.trusted, false);
    assert.deepEqual(getPlantReadingState(plant.id).health.issues, []);

    const payload = {
      capturedAt: new Date().toISOString(),
      soilRaw: 3500,
      soilPercent: 3,
      airTempC: 24,
      airHumidityPercent: 55,
      lightLux: 800,
      rssi: -50,
      batteryMv: null
    };
    for (let index = 0; index < 5; index += 1) {
      recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString() });
    }
    await flushAsyncTasks();

    const events = getDb()
      .prepare("SELECT COUNT(*) AS count FROM proactive_event_log WHERE plant_id = ?")
      .get(plant.id) as { count: number };
    assert.equal(events.count, 0);

    addMessage(
      plant.id,
      nextTurn(plant.id),
      "user",
      "传感器已经插入土里，现在是真实数据。"
    );
    assert.equal(getSensorTrust(plant.id).trusted, true);
  } finally {
    cleanup(plant.id);
  }
});

test("plant background can mark sensor data as untrusted", () => {
  migrate();
  const plant = createPlant({
    name: "背景信任测试",
    species: "绿萝",
    backgroundInfo: "传感器目前放在桌上，没有插入土里，数据不真实。"
  });
  try {
    const state = getPlantReadingState(plant.id);
    assert.equal(state.sensorTrust.trusted, false);
    assert.match(state.sensorTrust.reason, /植物背景/);
    assert.equal(state.health.mood, "等待真实感知");
  } finally {
    cleanup(plant.id);
  }
});

test("chat reminder language becomes a due reminder message", async () => {
  migrate();
  const now = new Date("2026-05-27T10:00:00.000Z");
  const plan = detectReminderPlan("十分钟后提醒我浇水", now);
  assert.ok(plan);
  assert.equal(plan.text, "浇水");
  assert.equal(plan.remindAt.toISOString(), "2026-05-27T10:10:00.000Z");

  const plant = createPlant({ name: "提醒测试", species: "绿萝" });
  try {
    const reminder = createReminder(plant.id, plan.text, plan.remindAt);
    await runReminderJob({
      id: "test-job",
      type: "proactive.reminder",
      status: "running",
      dedupeKey: null,
      payload: { reminderId: reminder.id },
      attempts: 1,
      maxAttempts: 3,
      runAfter: reminder.remindAt,
      lockedAt: null,
      lockedBy: null,
      lastError: "",
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt
    } as BackgroundJob);

    assert.equal(getReminder(reminder.id)?.status, "sent");
    const row = getDb()
      .prepare("SELECT content FROM messages WHERE plant_id = ? ORDER BY id DESC LIMIT 1")
      .get(plant.id) as { content: string };
    assert.match(row.content, /提醒你：浇水/);
  } finally {
    cleanup(plant.id);
  }
});
