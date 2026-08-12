import { randomUUID } from "node:crypto";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import type { ProactiveReminder, ReminderStatus } from "./types.js";

type ReminderRow = {
  id: string;
  plant_id: string;
  source_message_id: number | null;
  text: string;
  remind_at: string;
  status: ReminderStatus;
  claim_token: string | null;
  claim_expires_at: string | null;
  message_id: number | null;
  created_at: string;
  updated_at: string;
};

const toReminder = (row: ReminderRow): ProactiveReminder => ({
  id: row.id,
  plantId: row.plant_id,
  sourceMessageId: row.source_message_id,
  text: row.text,
  remindAt: row.remind_at,
  status: row.status,
  claimToken: row.claim_token,
  claimExpiresAt: row.claim_expires_at,
  messageId: row.message_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const createReminder = async (
  plantId: string,
  text: string,
  remindAt: Date,
  sourceMessageId: number | null = null
): Promise<ProactiveReminder> => {
  const id = randomUUID();
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO proactive_reminders
       (id, plant_id, source_message_id, text, remind_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)`
    )
    .run(id, plantId, sourceMessageId, text, remindAt.toISOString(), now, now);
  return (await getReminder(id))!;
};

export const getReminder = async (id: string): Promise<ProactiveReminder | null> => {
  const row = await getDb().prepare("SELECT * FROM proactive_reminders WHERE id = ?").get<ReminderRow>(id);
  return row ? toReminder(row) : null;
};

export const listDueReminders = async (untilIso: string): Promise<ProactiveReminder[]> => {
  const rows = await getDb()
    .prepare(
      `SELECT * FROM proactive_reminders
       WHERE remind_at <= ? AND (
         status = 'scheduled' OR
         (status = 'processing' AND claim_expires_at IS NOT NULL AND claim_expires_at <= ?)
       )
       ORDER BY remind_at ASC`
    )
    .all<ReminderRow>(untilIso, untilIso);
  return rows.map(toReminder);
};

export const claimDueReminder = async (
  id: string,
  leaseMs: number,
  now = new Date()
): Promise<ProactiveReminder | null> => {
  const token = randomUUID();
  const nowText = now.toISOString();
  const expiresAt = new Date(now.getTime() + leaseMs).toISOString();
  const result = await getDb().prepare(
    `UPDATE proactive_reminders
     SET status = 'processing', claim_token = ?, claim_expires_at = ?, updated_at = ?
     WHERE id = ? AND remind_at <= ? AND (
       status = 'scheduled' OR
       (status = 'processing' AND claim_expires_at IS NOT NULL AND claim_expires_at <= ?)
     )`
  ).run(token, expiresAt, nowText, id, nowText, nowText);
  if (result.changes === 0) return null;
  return getReminder(id);
};

export const expireReminderClaim = async (
  id: string,
  token: string
): Promise<boolean> => {
  const result = await getDb().prepare(
    `UPDATE proactive_reminders
     SET status = 'expired', claim_token = NULL, claim_expires_at = NULL, updated_at = ?
     WHERE id = ? AND status = 'processing' AND claim_token = ?`
  ).run(nowIso(), id, token);
  return result.changes > 0;
};

export const releaseReminderClaim = async (id: string, token: string): Promise<void> => {
  await getDb().prepare(
    `UPDATE proactive_reminders
     SET status = 'scheduled', claim_token = NULL, claim_expires_at = NULL, updated_at = ?
     WHERE id = ? AND status = 'processing' AND claim_token = ?`
  ).run(nowIso(), id, token);
};

export const cancelMatchingReminders = async (
  plantId: string,
  matches: (text: string) => boolean
): Promise<number> => {
  const rows = await getDb().prepare(
    `SELECT * FROM proactive_reminders
     WHERE plant_id = ? AND status IN ('scheduled', 'processing')`
  ).all<ReminderRow>(plantId);
  let cancelled = 0;
  for (const row of rows) {
    if (!matches(row.text)) continue;
    const result = await getDb().prepare(
      `UPDATE proactive_reminders
       SET status = 'cancelled', claim_token = NULL, claim_expires_at = NULL, updated_at = ?
       WHERE id = ? AND status IN ('scheduled', 'processing')`
    ).run(nowIso(), row.id);
    cancelled += result.changes;
  }
  return cancelled;
};

export const markReminderStatus = async (
  id: string,
  status: ReminderStatus
): Promise<ProactiveReminder | null> => {
  await getDb()
    .prepare(
      `UPDATE proactive_reminders
       SET status = ?, claim_token = NULL, claim_expires_at = NULL, updated_at = ? WHERE id = ?`
    )
    .run(status, nowIso(), id);
  return getReminder(id);
};
