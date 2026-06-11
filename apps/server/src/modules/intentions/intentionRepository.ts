import { randomUUID } from "node:crypto";
import type {
  PlantIntention,
  PlantIntentionKind,
  PlantIntentionStatus
} from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import { intentionRetryDelayMs } from "./intentionBackoff.js";

type IntentionRow = {
  id: string;
  plant_id: string;
  kind: PlantIntentionKind;
  content: string;
  source_type: PlantIntention["sourceType"];
  source_id: string | null;
  priority: 1 | 2 | 3;
  status: PlantIntentionStatus;
  not_before: string | null;
  expires_at: string | null;
  last_considered_at: string | null;
  considered_count: number;
  attempt_count: number;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
};

const toIntention = (row: IntentionRow): PlantIntention => ({
  id: row.id,
  plantId: row.plant_id,
  kind: row.kind,
  content: row.content,
  sourceType: row.source_type,
  sourceId: row.source_id,
  priority: row.priority,
  status: row.status,
  notBefore: row.not_before,
  expiresAt: row.expires_at,
  lastConsideredAt: row.last_considered_at,
  consideredCount: row.considered_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export type CreateIntentionInput = Pick<
  PlantIntention,
  "plantId" | "kind" | "content" | "sourceType" | "sourceId" | "priority" | "notBefore" | "expiresAt"
>;

export const createIntention = async (input: CreateIntentionInput): Promise<PlantIntention> => {
  return getDb().transaction(async (db) => {
    const existing = await db.prepare(
      `SELECT * FROM plant_intentions
       WHERE plant_id = ? AND status = 'pending' AND kind = ? AND content = ?
       LIMIT 1`
    ).get<IntentionRow>(input.plantId, input.kind, input.content);
    if (existing) return toIntention(existing);
    const id = randomUUID();
    const now = nowIso();
    await db.prepare(
      `INSERT INTO plant_intentions
       (id, plant_id, kind, content, source_type, source_id, priority, status,
        not_before, expires_at, last_considered_at, considered_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, 0, ?, ?)`
    ).run(
      id, input.plantId, input.kind, input.content, input.sourceType, input.sourceId,
      input.priority, input.notBefore, input.expiresAt, now, now
    );
    const row = await db.prepare("SELECT * FROM plant_intentions WHERE id = ?").get<IntentionRow>(id);
    return toIntention(row!);
  });
};

export const getIntention = async (id: string): Promise<PlantIntention | null> => {
  const row = await getDb().prepare("SELECT * FROM plant_intentions WHERE id = ?").get<IntentionRow>(id);
  return row ? toIntention(row) : null;
};

export const listPendingIntentions = async (plantId: string, limit = 10): Promise<PlantIntention[]> => {
  const now = nowIso();
  await getDb().prepare(
    `UPDATE plant_intentions SET status = 'expired', updated_at = ?
     WHERE plant_id = ? AND status = 'pending' AND expires_at IS NOT NULL AND expires_at <= ?`
  ).run(now, plantId, now);
  const rows = await getDb().prepare(
    `SELECT * FROM plant_intentions
     WHERE plant_id = ? AND status = 'pending' AND (not_before IS NULL OR not_before <= ?)
     ORDER BY priority DESC, created_at ASC LIMIT ?`
  ).all<IntentionRow>(plantId, now, limit);
  return rows.map(toIntention);
};

export const updateIntentionStatus = async (
  id: string,
  status: PlantIntentionStatus
): Promise<PlantIntention | null> => {
  await getDb().prepare("UPDATE plant_intentions SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, nowIso(), id);
  return getIntention(id);
};

export const noteIntentionConsidered = async (id: string): Promise<PlantIntention | null> => {
  const now = nowIso();
  await getDb().prepare(
    `UPDATE plant_intentions
     SET last_considered_at = ?, considered_count = considered_count + 1,
         attempt_count = 0, last_attempt_at = NULL, updated_at = ?
     WHERE id = ?`
  ).run(now, now, id);
  return getIntention(id);
};

export const deferIntentionAfterFailure = async (
  id: string,
  baseDelayMs: number,
  maxDelayMs: number
): Promise<PlantIntention | null> => {
  const row = await getDb().prepare(
    "SELECT attempt_count FROM plant_intentions WHERE id = ?"
  ).get<{ attempt_count: number }>(id);
  if (!row) return null;
  const attemptCount = row.attempt_count + 1;
  const delayMs = intentionRetryDelayMs(attemptCount, baseDelayMs, maxDelayMs);
  const now = nowIso();
  const retryAt = new Date(Date.now() + delayMs).toISOString();
  await getDb().prepare(
    `UPDATE plant_intentions
     SET attempt_count = ?, last_attempt_at = ?, not_before = ?, updated_at = ?
     WHERE id = ?`
  ).run(attemptCount, now, retryAt, now, id);
  return getIntention(id);
};
