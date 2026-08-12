import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { env } from "../../config/env.js";
import { migrate } from "../../db/migrate.js";
import { closeDb, getDb } from "../../db/connection.js";
import { createPlant } from "../plants/plantRepository.js";
import { insertClaimedDevice } from "../devices/deviceRepository.js";
import { getPlantReadingState, recordDeviceReading } from "../readings/readingService.js";
import { parseChatResponse } from "../chat/responseProtocol.js";
import { claimDueReminder, createReminder, getReminder } from "./reminderRepository.js";
import { runReminderJob } from "./reminderJob.js";
import { executeChatToolCalls } from "./reminderTool.js";
import type { BackgroundJob } from "../jobs/jobTypes.js";
import { deliverDueReminder } from "./reminderDelivery.js";
import { finalizeReminderDelivery } from "./reminderFinalizer.js";

const cleanup = async (plantId: string): Promise<void> => {
  const db = getDb();
  await db.prepare("DELETE FROM background_jobs WHERE type = 'proactive.reminder'").run();
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

test("scheduled reminder job becomes a due reminder message", async () => {
  await migrate();
  const plant = await createPlant({ name: "提醒测试", species: "绿萝" });
  try {
    const reminder = await createReminder(plant.id, "浇水", new Date(Date.now() - 1_000));
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
    const drafts = await getDb()
      .prepare("SELECT COUNT(*) AS count FROM memory_drafts WHERE plant_id = ?")
      .get(plant.id) as { count: number };
    assert.equal(drafts.count, 0);
  } finally {
    await cleanup(plant.id);
  }
});

test("custom chat tool call creates a reminder and background job", async () => {
  await migrate();
  const plant = await createPlant({ name: "工具提醒", species: "绿萝" });
  const due = new Date(Date.now() + 5 * 60_000).toISOString();
  try {
    const parsed = parseChatResponse(
      `我记下了。<tool_calls>[{"name":"create_reminder","arguments":{"text":"浇水","remind_at":"${due}"}}]</tool_calls>`
    );
    const reminders = await executeChatToolCalls({
      plantId: plant.id,
      toolCalls: parsed.toolCalls,
      invalidToolCallsText: parsed.invalidToolCallsText,
      sourceMessageId: null,
      timezone: "Asia/Shanghai"
    });

    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].text, "浇水");
    const job = await getDb()
      .prepare("SELECT COUNT(*) AS count FROM background_jobs WHERE payload_json LIKE ?")
      .get(`%${reminders[0].id}%`) as { count: number };
    assert.equal(job.count, 1);
  } finally {
    await cleanup(plant.id);
  }
});

test("malformed custom chat tool calls can be repaired by the secondary model", async () => {
  await migrate();
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LLM_API_URL: env.LLM_API_URL,
    LLM_API_KEY: env.LLM_API_KEY,
    LLM_MODEL_ID: env.LLM_MODEL_ID,
    SECONDARY_LLM_MODEL_ID: env.SECONDARY_LLM_MODEL_ID
  };
  const plant = await createPlant({ name: "修复提醒", species: "绿萝" });
  const due = new Date(Date.now() + 5 * 60_000).toISOString();
  try {
    env.LLM_API_URL = "https://llm.test/v1";
    env.LLM_API_KEY = "test-key";
    env.LLM_MODEL_ID = "primary-test";
    env.SECONDARY_LLM_MODEL_ID = "secondary-test";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  name: "create_reminder",
                  arguments: { text: "喝水", remind_at: due }
                }
              ])
            }
          }
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      }), { status: 200 })) as typeof fetch;

    const reminders = await executeChatToolCalls({
      plantId: plant.id,
      toolCalls: [],
      invalidToolCallsText: `create_reminder text=喝水 remind_at=${due}`,
      sourceMessageId: null,
      timezone: "Asia/Shanghai"
    });

    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].text, "喝水");
  } finally {
    globalThis.fetch = originalFetch;
    env.LLM_API_URL = originalEnv.LLM_API_URL;
    env.LLM_API_KEY = originalEnv.LLM_API_KEY;
    env.LLM_MODEL_ID = originalEnv.LLM_MODEL_ID;
    env.SECONDARY_LLM_MODEL_ID = originalEnv.SECONDARY_LLM_MODEL_ID;
    await cleanup(plant.id);
  }
});

test("CAS reminder claim prevents duplicate delivery across competing paths", async () => {
  await migrate();
  const plant = await createPlant({ name: "并发提醒", species: "绿萝" });
  try {
    const reminder = await createReminder(plant.id, "关窗", new Date(Date.now() - 1_000));
    const results = await Promise.all([
      deliverDueReminder(reminder.id),
      deliverDueReminder(reminder.id)
    ]);
    assert.deepEqual([...results].sort(), ["sent", "skipped"]);
    const messages = await getDb().prepare(
      "SELECT COUNT(*) AS count FROM messages WHERE plant_id = ? AND role = 'assistant'"
    ).get<{ count: number }>(plant.id);
    assert.equal(messages?.count, 1);
    assert.equal((await getReminder(reminder.id))?.status, "sent");
  } finally {
    await cleanup(plant.id);
  }
});

test("a reminder claim token can finalize its message only once", async () => {
  await migrate();
  const plant = await createPlant({ name: "原子提醒", species: "绿萝" });
  try {
    const reminder = await createReminder(plant.id, "拉窗帘", new Date(Date.now() - 1_000));
    const claimed = await claimDueReminder(reminder.id, 60_000);
    assert.ok(claimed?.claimToken);
    const input = {
      reminderId: reminder.id,
      claimToken: claimed.claimToken,
      event: {
        plantId: plant.id,
        type: "reminder.due" as const,
        key: `reminder:${reminder.id}`,
        severity: "info" as const,
        content: "你让我提醒你：拉窗帘",
        payload: { reminderId: reminder.id, reminderText: "拉窗帘" },
        cooldownMs: 0
      },
      content: "你让我提醒你：拉窗帘"
    };
    const first = await finalizeReminderDelivery(input);
    const second = await finalizeReminderDelivery(input);

    assert.ok(first?.messageId);
    assert.equal(second, null);
    assert.equal((await getReminder(reminder.id))?.messageId, first.messageId);
    const messages = await getDb().prepare(
      "SELECT COUNT(*) AS count FROM messages WHERE plant_id = ? AND role = 'assistant'"
    ).get<{ count: number }>(plant.id);
    const events = await getDb().prepare(
      "SELECT COUNT(*) AS count FROM proactive_event_log WHERE event_key = ?"
    ).get<{ count: number }>(input.event.key);
    assert.equal(messages?.count, 1);
    assert.equal(events?.count, 1);
  } finally {
    await cleanup(plant.id);
  }
});

test("very late reminders expire and moderately late reminders narrate the delay", async () => {
  await migrate();
  const plant = await createPlant({ name: "迟到提醒", species: "绿萝" });
  try {
    const expired = await createReminder(
      plant.id,
      "昨天的事",
      new Date(Date.now() - 25 * 60 * 60_000)
    );
    assert.equal(await deliverDueReminder(expired.id), "expired");
    assert.equal((await getReminder(expired.id))?.status, "expired");

    const late = await createReminder(
      plant.id,
      "给妈妈打电话",
      new Date(Date.now() - 3 * 60 * 60_000)
    );
    assert.equal(await deliverDueReminder(late.id), "sent");
    const message = await getDb().prepare(
      "SELECT content FROM messages WHERE plant_id = ? ORDER BY id DESC LIMIT 1"
    ).get<{ content: string }>(plant.id);
    assert.match(message?.content ?? "", /抱歉，这句迟到了/);
    assert.match(message?.content ?? "", /给妈妈打电话/);
  } finally {
    await cleanup(plant.id);
  }
});

test("invalid reminder arguments create an honest visible failure notice", async () => {
  await migrate();
  const plant = await createPlant({ name: "失败提醒", species: "绿萝" });
  try {
    const reminders = await executeChatToolCalls({
      plantId: plant.id,
      toolCalls: [{
        name: "create_reminder",
        arguments: { text: "浇水", remind_at: "not-a-date" }
      }],
      sourceMessageId: null
    });
    assert.equal(reminders.length, 0);
    const message = await getDb().prepare(
      "SELECT role, content FROM messages WHERE plant_id = ? ORDER BY id DESC LIMIT 1"
    ).get<{ role: string; content: string }>(plant.id);
    assert.equal(message?.role, "system");
    assert.match(message?.content ?? "", /没能记下来/);
  } finally {
    await cleanup(plant.id);
  }
});
