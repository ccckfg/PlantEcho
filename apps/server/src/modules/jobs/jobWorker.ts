import { randomUUID } from "node:crypto";
import { jobConfig } from "../../config/jobs.js";
import { claimNextJob, completeJob, failJob, recoverStaleJobs } from "./jobRepository.js";
import type { BackgroundJob, JobHandlerMap } from "./jobTypes.js";

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export interface JobWorker {
  start: () => void;
  stop: () => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 1_000);
};

const retryDelay = (attempts: number): number => {
  const delay = jobConfig.retryBaseDelayMs * 2 ** Math.max(0, attempts - 1);
  return Math.min(delay, jobConfig.retryMaxDelayMs);
};

export const createJobWorker = (handlers: JobHandlerMap, logger: Logger): JobWorker => {
  const workerId = `server-${process.pid}-${randomUUID()}`;
  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = null;
  let stopped = true;
  let running = false;

  const schedule = (): void => {
    if (stopped) return;
    timer = setTimeout(() => void tick(), jobConfig.pollIntervalMs);
  };

  const runJob = async (job: BackgroundJob): Promise<void> => {
    const handler = handlers[job.type];
    if (!handler) {
      await failJob(job.id, `No handler registered for job type ${job.type}`, 0);
      return;
    }
    try {
      await handler(job, controller.signal);
      await completeJob(job.id);
    } catch (error) {
      const message = sanitizeError(error);
      const next = await failJob(job.id, message, retryDelay(job.attempts));
      logger.warn(`[jobs] ${job.type} failed: ${message}`);
      if (next?.status === "dead") {
        logger.error(`[jobs] ${job.type} exhausted retries: ${job.id}`);
      }
    }
  };

  const tick = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      const lockedBefore = new Date(Date.now() - jobConfig.lockTimeoutMs).toISOString();
      const recovered = await recoverStaleJobs(lockedBefore);
      if (recovered) logger.warn(`[jobs] recovered ${recovered} stale job(s)`);
      for (let i = 0; i < jobConfig.batchSize; i += 1) {
        const job = await claimNextJob(workerId);
        if (!job) break;
        await runJob(job);
      }
    } catch (error) {
      logger.error(`[jobs] worker tick failed: ${sanitizeError(error)}`);
    } finally {
      running = false;
      schedule();
    }
  };

  return {
    start: () => {
      if (!stopped) return;
      stopped = false;
      logger.info(`[jobs] worker started: ${workerId}`);
      void tick();
    },
    stop: async () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      while (running) await sleep(25);
      logger.info("[jobs] worker stopped");
    }
  };
};
