import { getDb } from "../../db/connection.js";
import type { DatabaseClient } from "../../db/types.js";
import { nowIso } from "../../shared/time.js";
import type { ProactiveEventInput } from "./types.js";

export const hasRecentProactiveEvent = async (
  plantId: string,
  eventKey: string,
  cooldownMs: number,
  now = Date.now()
): Promise<boolean> => {
  if (cooldownMs <= 0) return false;
  const since = new Date(now - cooldownMs).toISOString();
  const row = await getDb()
    .prepare(
      `SELECT id FROM proactive_event_log
       WHERE plant_id = ? AND event_key = ? AND fired_at >= ?
       LIMIT 1`
    )
    .get(plantId, eventKey, since);
  return Boolean(row);
};

export const logProactiveEvent = async (
  input: ProactiveEventInput,
  messageId: number | null
): Promise<number> => {
  return logProactiveEventWithDb(getDb(), input, messageId);
};

export const logProactiveEventWithDb = async (
  db: DatabaseClient,
  input: ProactiveEventInput,
  messageId: number | null
): Promise<number> => {
  const result = await db
    .prepare(
      `INSERT INTO proactive_event_log
       (plant_id, event_key, event_type, severity, message_id, payload_json, fired_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
    .run(
      input.plantId,
      input.key,
      input.type,
      input.severity,
      messageId,
      JSON.stringify(input.payload ?? {}),
      nowIso()
    );
  return Number(result.lastInsertRowid);
};

export const attachProactiveEventMessage = (
  eventLogId: number,
  messageId: number
): Promise<void> => {
  return attachProactiveEventMessageAsync(eventLogId, messageId);
};

const attachProactiveEventMessageAsync = async (
  eventLogId: number,
  messageId: number
): Promise<void> => {
  await getDb()
    .prepare("UPDATE proactive_event_log SET message_id = ? WHERE id = ?")
    .run(messageId, eventLogId);
};
