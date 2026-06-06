export const jobTypes = {
  memoryConsolidation: "memory.consolidation",
  memorySessionClosure: "memory.session-closure",
  proactiveReminder: "proactive.reminder"
} as const;

export type JobType = (typeof jobTypes)[keyof typeof jobTypes];
export type JobStatus = "queued" | "running" | "succeeded" | "dead";

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  dedupeKey: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  lockedAt: string | null;
  lockedBy: string | null;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueJobInput {
  type: JobType;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  runAfter?: string;
  maxAttempts?: number;
}

export type JobHandler = (job: BackgroundJob, signal: AbortSignal) => Promise<void>;
export type JobHandlerMap = Partial<Record<JobType, JobHandler>>;
