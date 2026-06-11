import { randomUUID } from "node:crypto";
import { jobConfig } from "../../config/jobs.js";
import { getDb } from "../../db/connection.js";
import type { DatabaseClient } from "../../db/types.js";
import { nowIso } from "../../shared/time.js";
import type { BackgroundJob, EnqueueJobInput, JobStatus, JobType } from "./jobTypes.js";

type JobRow = {
  id: string;
  type: string;
  status: string;
  dedupe_key: string | null;
  payload_json: string;
  attempts: number;
  max_attempts: number;
  run_after: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

const parsePayload = (text: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const toJob = (row: JobRow): BackgroundJob => ({
  id: row.id,
  type: row.type as JobType,
  status: row.status as JobStatus,
  dedupeKey: row.dedupe_key,
  payload: parsePayload(row.payload_json),
  attempts: row.attempts,
  maxAttempts: row.max_attempts,
  runAfter: row.run_after,
  lockedAt: row.locked_at,
  lockedBy: row.locked_by,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const enqueueJob = async (input: EnqueueJobInput): Promise<BackgroundJob> => {
  const id = randomUUID();
  const now = nowIso();
  await getDb().prepare(
    `INSERT INTO background_jobs
     (id, type, status, dedupe_key, payload_json, attempts, max_attempts,
      run_after, locked_at, locked_by, last_error, created_at, updated_at)
     VALUES (?, ?, 'queued', ?, ?, 0, ?, ?, NULL, NULL, '', ?, ?)`
  ).run(
    id,
    input.type,
    input.dedupeKey ?? null,
    JSON.stringify(input.payload),
    input.maxAttempts ?? jobConfig.defaultMaxAttempts,
    input.runAfter ?? now,
    now,
    now
  );
  return (await getJob(id))!;
};

export const getJob = async (id: string): Promise<BackgroundJob | null> => {
  return getJobWithDb(getDb(), id);
};

const getJobWithDb = async (
  db: DatabaseClient,
  id: string
): Promise<BackgroundJob | null> => {
  const row = await db.prepare("SELECT * FROM background_jobs WHERE id = ?").get<JobRow>(id);
  return row ? toJob(row) : null;
};

export const findActiveJobByDedupeKey = async (
  dedupeKey: string
): Promise<BackgroundJob | null> => {
  const row = await getDb()
    .prepare(
      `SELECT * FROM background_jobs
       WHERE dedupe_key = ? AND status IN ('queued', 'running')
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get<JobRow>(dedupeKey);
  return row ? toJob(row) : null;
};

export const updateJobPayload = async (
  id: string,
  payload: Record<string, unknown>,
  runAfter?: string
): Promise<BackgroundJob | null> => {
  const now = nowIso();
  await getDb().prepare(
    `UPDATE background_jobs
     SET payload_json = ?, run_after = COALESCE(?, run_after), updated_at = ?
     WHERE id = ? AND status IN ('queued', 'running')`
  ).run(JSON.stringify(payload), runAfter ?? null, now, id);
  return getJob(id);
};

export const claimNextJob = async (workerId: string): Promise<BackgroundJob | null> => {
  const now = nowIso();
  return getDb().transaction(async (db) => {
    const lockClause = db.provider === "postgres" ? " FOR UPDATE SKIP LOCKED" : "";
    const row = await db
      .prepare(
        `SELECT * FROM background_jobs
         WHERE status = 'queued' AND run_after <= ?
         ORDER BY run_after ASC, created_at ASC
         LIMIT 1${lockClause}`
      )
      .get<JobRow>(now);
    if (!row) return null;

    await db.prepare(
      `UPDATE background_jobs
       SET status = 'running', attempts = attempts + 1, locked_at = ?, locked_by = ?, updated_at = ?
       WHERE id = ? AND status = 'queued'`
    ).run(now, workerId, now, row.id);
    return getJobWithDb(db, row.id);
  });
};

export const completeJob = async (id: string): Promise<void> => {
  const now = nowIso();
  await getDb().prepare(
    `UPDATE background_jobs
     SET status = 'succeeded', locked_at = NULL, locked_by = NULL, last_error = '', updated_at = ?
     WHERE id = ?`
  ).run(now, id);
};

export const failJob = async (
  id: string,
  error: string,
  retryDelayMs: number
): Promise<BackgroundJob | null> => {
  const job = await getJob(id);
  if (!job) return null;
  const now = nowIso();
  const exhausted = job.attempts >= job.maxAttempts;
  const runAfter = new Date(Date.now() + retryDelayMs).toISOString();
  await getDb().prepare(
    `UPDATE background_jobs
     SET status = ?, run_after = ?, locked_at = NULL, locked_by = NULL, last_error = ?, updated_at = ?
     WHERE id = ?`
  ).run(exhausted ? "dead" : "queued", exhausted ? job.runAfter : runAfter, error, now, id);
  return getJob(id);
};

export const recoverStaleJobs = async (lockedBeforeIso: string): Promise<number> => {
  const now = nowIso();
  const result = await getDb().prepare(
    `UPDATE background_jobs
     SET status = 'queued',
         locked_at = NULL,
         locked_by = NULL,
         last_error = 'Recovered stale running job',
         updated_at = ?
     WHERE status = 'running' AND locked_at < ?`
  ).run(now, lockedBeforeIso);
  return Number(result.changes);
};
