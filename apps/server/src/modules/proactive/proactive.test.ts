import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { migrate } from "../../db/migrate.js";
import { closeDb, getDb } from "../../db/connection.js";
import { createPlant } from "../plants/plantRepository.js";
import { insertClaimedDevice } from "../devices/deviceRepository.js";
import { getPlantReadingState, recordDeviceReading } from "../readings/readingService.js";
import { detectReminderPlan } from "./reminderDetector.js";
import { createReminder, getReminder } from "./reminderRepository.js";
import { runReminderJob } from "./reminderJob.js";
import { scheduleReminderFromUserMessage } from "./reminderTool.js";
import type { BackgroundJob } from "../jobs/jobTypes.js";

const cleanup = async (plantId: string): Promise<void> => {
  const db = getDb();
  await db.prepare("DELETE FROM background_jobs WHERE payload_json LIKE ?").run(`%${plantId}%`);
  await db.prepare("DELETE FROM plants WHERE id = ?").run(plantId);
  await closeDb();
};

test("sensor readings remain physical state and do not emit proactive messages or drafts", async () => {
  await migrate();
  const plant = await createPlant({ name: "测试小绿", species: "绿萝" });
  const deviceId = `test-proactive-${randomUUID()}`;
  await insertClaimedDevice(deviceId, plant.id, "Test ESP32", "hash");
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
    await recordDeviceReading(deviceId, payload);
    await recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString(), soilRaw: 3300 });
    await recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString(), soilRaw: 3400 });
    await recordDeviceReading(deviceId, { ...payload, capturedAt: new Date().toISOString(), soilRaw: 3500 });
    const events = await getDb()
      .prepare("SELECT COUNT(*) AS count FROM proactive_event_log WHERE plant_id = ?")
      .get(plant.id) as { count: number };
    const messages = await getDb()
      .prepare("SELECT COUNT(*) AS count FROM messages WHERE plant_id = ? AND role = 'assistant'")
      .get(plant.id) as { count: number };
    const drafts = await getDb()
      .prepare("SELECT COUNT(*) AS count FROM memory_drafts WHERE plant_id = ?")
      .get(plant.id) as { count: number };
    assert.equal(events.count, 0);
    assert.equal(messages.count, 0);
    assert.equal(drafts.count, 0);
    assert.equal((await getPlantReadingState(plant.id)).health.issues[0]?.code, "soil_low");
  } finally {
    await cleanup(plant.id);
  }
});

test("chat reminder language becomes a due reminder message", async () => {
  await migrate();
  const now = new Date("2026-05-27T10:00:00.000Z");
  const plan = detectReminderPlan("十分钟后提醒我浇水", now);
  assert.ok(plan);
  assert.equal(plan.text, "浇水");
  assert.equal(plan.remindAt.toISOString(), "2026-05-27T10:10:00.000Z");

  const plant = await createPlant({ name: "提醒测试", species: "绿萝" });
  try {
    const reminder = await createReminder(plant.id, plan.text, plan.remindAt);
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

    assert.equal((await getReminder(reminder.id))?.status, "sent");
    const row = await getDb()
      .prepare("SELECT content FROM messages WHERE plant_id = ? ORDER BY id DESC LIMIT 1")
      .get(plant.id) as { content: string };
    assert.match(row.content, /提醒你：浇水/);
    const draft = await getDb()
      .prepare("SELECT text, metadata_json FROM memory_drafts WHERE plant_id = ? ORDER BY id DESC LIMIT 1")
      .get(plant.id) as { text: string; metadata_json: string };
    assert.match(draft.text, /提醒你：浇水/);
    assert.equal(JSON.parse(draft.metadata_json).sourceType, "proactive:reminder.due");
  } finally {
    await cleanup(plant.id);
  }
});

test("reminder tool call creates reminders without rule fallback", async () => {
  await migrate();
  const originalFetch = globalThis.fetch;
  const plant = await createPlant({ name: "工具提醒", species: "绿萝" });
  const due = new Date(Date.now() + 5 * 60_000).toISOString();
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  type: "function",
                  function: {
                    name: "create_reminder",
                    arguments: JSON.stringify({ text: "浇水", remind_at: due })
                  }
                }
              ]
            }
          }
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      }), { status: 200 })) as typeof fetch;

    const reminder = await scheduleReminderFromUserMessage(
      plant.id,
      "5min后提醒我浇水",
      null,
      "Asia/Shanghai"
    );
    assert.ok(reminder);
    assert.equal(reminder.text, "浇水");

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: "不需要提醒" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      }), { status: 200 })) as typeof fetch;

    const noFallback = await scheduleReminderFromUserMessage(
      plant.id,
      "5分钟后提醒我浇水",
      null,
      "Asia/Shanghai"
    );
    assert.equal(noFallback, null);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanup(plant.id);
  }
});
