import { randomUUID } from "node:crypto";
import { jobConfig } from "../../config/jobs.js";
import { getDb } from "../../db/connection.js";
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

export const enqueueJob = (input: EnqueueJobInput): BackgroundJob => {
  const id = randomUUID();
  const now = nowIso();
  getDb().prepare(
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
  return getJob(id)!;
};

export const getJob = (id: string): BackgroundJob | null => {
  const row = getDb().prepare("SELECT * FROM background_jobs WHERE id = ?").get(id) as JobRow | undefined;
  return row ? toJob(row) : null;
};

export const findActiveJobByDedupeKey = (dedupeKey: string): BackgroundJob | null => {
  const row = getDb()
    .prepare(
      `SELECT * FROM background_jobs
       WHERE dedupe_key = ? AND status IN ('queued', 'running')
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get(dedupeKey) as JobRow | undefined;
  return row ? toJob(row) : null;
};

export const updateJobPayload = (
  id: string,
  payload: Record<string, unknown>,
  runAfter?: string
): BackgroundJob | null => {
  const now = nowIso();
  getDb().prepare(
    `UPDATE background_jobs
     SET payload_json = ?, run_after = COALESCE(?, run_after), updated_at = ?
     WHERE id = ? AND status IN ('queued', 'running')`
  ).run(JSON.stringify(payload), runAfter ?? null, now, id);
  return getJob(id);
};

export const claimNextJob = (workerId: string): BackgroundJob | null => {
  const now = nowIso();
  const row = getDb()
    .prepare(
      `SELECT * FROM background_jobs
       WHERE status = 'queued' AND run_after <= ?
       ORDER BY run_after ASC, created_at ASC
       LIMIT 1`
    )
    .get(now) as JobRow | undefined;
  if (!row) return null;

  getDb().prepare(
    `UPDATE background_jobs
     SET status = 'running', attempts = attempts + 1, locked_at = ?, locked_by = ?, updated_at = ?
     WHERE id = ? AND status = 'queued'`
  ).run(now, workerId, now, row.id);
  return getJob(row.id);
};

export const completeJob = (id: string): void => {
  const now = nowIso();
  getDb().prepare(
    `UPDATE background_jobs
     SET status = 'succeeded', locked_at = NULL, locked_by = NULL, last_error = '', updated_at = ?
     WHERE id = ?`
  ).run(now, id);
};

export const failJob = (id: string, error: string, retryDelayMs: number): BackgroundJob | null => {
  const job = getJob(id);
  if (!job) return null;
  const now = nowIso();
  const exhausted = job.attempts >= job.maxAttempts;
  const runAfter = new Date(Date.now() + retryDelayMs).toISOString();
  getDb().prepare(
    `UPDATE background_jobs
     SET status = ?, run_after = ?, locked_at = NULL, locked_by = NULL, last_error = ?, updated_at = ?
     WHERE id = ?`
  ).run(exhausted ? "dead" : "queued", exhausted ? job.runAfter : runAfter, error, now, id);
  return getJob(id);
};

export const recoverStaleJobs = (lockedBeforeIso: string): number => {
  const now = nowIso();
  const result = getDb().prepare(
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
