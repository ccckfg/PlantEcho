import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { migrate } from "../../db/migrate.js";
import { getDb } from "../../db/connection.js";
import { createPlant } from "../plants/plantRepository.js";
import { insertClaimedDevice } from "../devices/deviceRepository.js";
import { recordDeviceReading } from "../readings/readingService.js";
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

test("low soil reading emits one proactive assistant message within cooldown", async () => {
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
    await flushAsyncTasks();

    const events = getDb()
      .prepare("SELECT COUNT(*) AS count FROM proactive_event_log WHERE plant_id = ? AND event_type = ?")
      .get(plant.id, "sensor.soil_low") as { count: number };
    const messages = getDb()
      .prepare("SELECT COUNT(*) AS count FROM messages WHERE plant_id = ? AND role = 'assistant' AND content LIKE ?")
      .get(plant.id, "%渴%") as { count: number };
    assert.equal(events.count, 1);
    assert.equal(messages.count, 1);
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
