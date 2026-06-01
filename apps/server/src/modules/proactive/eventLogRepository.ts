import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import type { ProactiveEventInput } from "./types.js";

export const hasRecentProactiveEvent = (
  plantId: string,
  eventKey: string,
  cooldownMs: number,
  now = Date.now()
): boolean => {
  if (cooldownMs <= 0) return false;
  const since = new Date(now - cooldownMs).toISOString();
  const row = getDb()
    .prepare(
      `SELECT id FROM proactive_event_log
       WHERE plant_id = ? AND event_key = ? AND fired_at >= ?
       LIMIT 1`
    )
    .get(plantId, eventKey, since);
  return Boolean(row);
};

export const logProactiveEvent = (
  input: ProactiveEventInput,
  messageId: number | null
): number => {
  const result = getDb()
    .prepare(
      `INSERT INTO proactive_event_log
       (plant_id, event_key, event_type, severity, message_id, payload_json, fired_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
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
): void => {
  getDb()
    .prepare("UPDATE proactive_event_log SET message_id = ? WHERE id = ?")
    .run(messageId, eventLogId);
};
