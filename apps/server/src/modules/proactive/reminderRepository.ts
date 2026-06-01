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
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const createReminder = (
  plantId: string,
  text: string,
  remindAt: Date,
  sourceMessageId: number | null = null
): ProactiveReminder => {
  const id = randomUUID();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO proactive_reminders
       (id, plant_id, source_message_id, text, remind_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)`
    )
    .run(id, plantId, sourceMessageId, text, remindAt.toISOString(), now, now);
  return getReminder(id)!;
};

export const getReminder = (id: string): ProactiveReminder | null => {
  const row = getDb().prepare("SELECT * FROM proactive_reminders WHERE id = ?").get(id) as
    | ReminderRow
    | undefined;
  return row ? toReminder(row) : null;
};

export const listDueReminders = (untilIso: string): ProactiveReminder[] => {
  const rows = getDb()
    .prepare(
      `SELECT * FROM proactive_reminders
       WHERE status = 'scheduled' AND remind_at <= ?
       ORDER BY remind_at ASC`
    )
    .all(untilIso) as ReminderRow[];
  return rows.map(toReminder);
};

export const markReminderStatus = (
  id: string,
  status: ReminderStatus
): ProactiveReminder | null => {
  getDb()
    .prepare("UPDATE proactive_reminders SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, nowIso(), id);
  return getReminder(id);
};
