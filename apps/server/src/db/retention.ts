import { env } from "../config/env.js";
import { getDb } from "./connection.js";

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

type RetentionPolicy = {
  name: string;
  days: number;
  sql: string;
};

export type RetentionCleanupResult = {
  deleted: Record<string, number>;
  totalDeleted: number;
  ranAt: string;
};

export interface RetentionWorker {
  start: () => void;
  stop: () => Promise<void>;
  runNow: () => Promise<RetentionCleanupResult>;
}

const dayMs = 86_400_000;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const cutoffIso = (now: Date, days: number): string =>
  new Date(now.getTime() - days * dayMs).toISOString();

const retentionPolicies = (): RetentionPolicy[] => [
  {
    name: "sensor_readings",
    days: env.RETENTION_SENSOR_RAW_DAYS,
    sql: "DELETE FROM sensor_readings WHERE created_at < ?"
  },
  {
    name: "sync_events",
    days: env.RETENTION_SYNC_EVENTS_DAYS,
    sql: "DELETE FROM sync_events WHERE created_at < ?"
  },
  {
    name: "background_jobs",
    days: env.RETENTION_SUCCEEDED_JOBS_DAYS,
    sql: "DELETE FROM background_jobs WHERE status = 'succeeded' AND updated_at < ?"
  },
  {
    name: "memory_drafts",
    days: env.RETENTION_CONSUMED_DRAFTS_DAYS,
    sql: "DELETE FROM memory_drafts WHERE consumed_at IS NOT NULL AND consumed_at < ?"
  },
  {
    name: "llm_usage_logs",
    days: env.RETENTION_LLM_USAGE_DAYS,
    sql: "DELETE FROM llm_usage_logs WHERE created_at < ?"
  },
  {
    name: "proactive_event_log",
    days: env.RETENTION_PROACTIVE_EVENTS_DAYS,
    sql: "DELETE FROM proactive_event_log WHERE fired_at < ?"
  },
  {
    name: "proactive_decisions",
    days: env.RETENTION_PROACTIVE_DECISIONS_DAYS,
    sql: "DELETE FROM proactive_decisions WHERE considered_at < ?"
  },
  {
    name: "proactive_reminders",
    days: env.RETENTION_FINISHED_REMINDERS_DAYS,
    sql: "DELETE FROM proactive_reminders WHERE status IN ('sent', 'cancelled', 'expired') AND updated_at < ?"
  },
  {
    name: "auth_sessions",
    days: env.RETENTION_AUTH_SESSIONS_DAYS,
    sql: "DELETE FROM auth_sessions WHERE (revoked_at IS NOT NULL AND revoked_at < ?) OR expires_at < ?"
  },
  {
    name: "pending_devices",
    days: env.RETENTION_PENDING_DEVICES_DAYS,
    sql: "DELETE FROM pending_devices WHERE claim_status IN ('claimed', 'ignored') AND last_seen_at < ?"
  }
];

export const runRetentionCleanup = async (now = new Date()): Promise<RetentionCleanupResult> => {
  const deleted: Record<string, number> = {};
  await getDb().transaction(async (db) => {
    for (const policy of retentionPolicies()) {
      const cutoff = cutoffIso(now, policy.days);
      const params = policy.name === "auth_sessions" ? [cutoff, cutoff] : [cutoff];
      const result = await db.prepare(policy.sql).run(...params);
      deleted[policy.name] = Number(result.changes);
    }
  });
  const totalDeleted = Object.values(deleted).reduce((sum, count) => sum + count, 0);
  return { deleted, totalDeleted, ranAt: now.toISOString() };
};

export const createRetentionWorker = (logger: Logger): RetentionWorker => {
  let stopped = true;
  let running = false;
  let timer: NodeJS.Timeout | null = null;

  const schedule = (): void => {
    if (stopped) return;
    timer = setTimeout(() => void tick(), env.RETENTION_CLEANUP_INTERVAL_MS);
  };

  const tick = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      const result = await runRetentionCleanup();
      if (result.totalDeleted > 0) {
        logger.info(`[retention] deleted ${result.totalDeleted} expired row(s)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[retention] cleanup failed: ${message}`);
    } finally {
      running = false;
      schedule();
    }
  };

  return {
    start: () => {
      if (!stopped) return;
      stopped = false;
      logger.info("[retention] worker started");
      void tick();
    },
    stop: async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      while (running) await sleep(25);
      logger.info("[retention] worker stopped");
    },
    runNow: runRetentionCleanup
  };
};
