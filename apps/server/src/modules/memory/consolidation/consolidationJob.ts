import { jobConfig } from "../../../config/jobs.js";
import { jobTypes, type BackgroundJob } from "../../jobs/jobTypes.js";
import {
  enqueueJob,
  findActiveJobByDedupeKey,
  updateJobPayload
} from "../../jobs/jobRepository.js";
import { getConsolidationState } from "../repositories/consolidationRepository.js";
import {
  finishConsolidationRun,
  notePendingConsolidation,
  startConsolidationRun
} from "./consolidationState.js";
import { runConsolidationPipeline } from "./llmConsolidation.js";
import { memoryConfig } from "../../../config/memory.js";

type ConsolidationPayload = {
  plantId: string;
  plantName: string;
  currentTurn: number;
};

const dedupeKey = (plantId: string): string => `memory.consolidation:${plantId}`;
const sessionDedupeKey = (plantId: string): string => `memory.session-closure:${plantId}`;

const asPayload = (payload: Record<string, unknown>): ConsolidationPayload => {
  const plantId = typeof payload.plantId === "string" ? payload.plantId : "";
  const plantName = typeof payload.plantName === "string" ? payload.plantName : "";
  const currentTurn = Number(payload.currentTurn);
  if (!plantId || !plantName || !Number.isFinite(currentTurn)) {
    throw new Error("Invalid memory consolidation payload");
  }
  return { plantId, plantName, currentTurn };
};

export const mergeConsolidationPayload = (
  current: Record<string, unknown>,
  next: ConsolidationPayload
): ConsolidationPayload => {
  const existingTurn = Number(current.currentTurn);
  return {
    plantId: next.plantId,
    plantName: next.plantName,
    currentTurn: Math.max(Number.isFinite(existingTurn) ? existingTurn : 0, next.currentTurn)
  };
};

export const scheduleDetectAndConsolidate = (
  plantId: string,
  plantName: string,
  currentTurn: number
): void => {
  const key = dedupeKey(plantId);
  const next = { plantId, plantName, currentTurn };
  const existing = findActiveJobByDedupeKey(key);
  if (existing) {
    updateJobPayload(existing.id, mergeConsolidationPayload(existing.payload, next));
    if (existing.status === "running") notePendingConsolidation(plantId, currentTurn);
    return;
  }
  enqueueJob({
    type: jobTypes.memoryConsolidation,
    payload: next,
    dedupeKey: key,
    maxAttempts: jobConfig.consolidationMaxAttempts
  });
};

export const scheduleSessionClosure = (
  plantId: string,
  plantName: string,
  currentTurn: number
): void => {
  const key = sessionDedupeKey(plantId);
  const payload = { plantId, plantName, currentTurn };
  const runAfter = new Date(Date.now() + memoryConfig.sessionClosureDelayMs).toISOString();
  const existing = findActiveJobByDedupeKey(key);
  if (existing) {
    updateJobPayload(existing.id, mergeConsolidationPayload(existing.payload, payload), runAfter);
    return;
  }
  enqueueJob({
    type: jobTypes.memorySessionClosure,
    payload,
    dedupeKey: key,
    runAfter,
    maxAttempts: jobConfig.consolidationMaxAttempts
  });
};

export const runConsolidationJob = async (job: BackgroundJob): Promise<void> => {
  const payload = asPayload(job.payload);
  let currentTurn = Math.max(payload.currentTurn, getConsolidationState(payload.plantId).pendingTurn ?? 0);

  while (true) {
    const runTurn = startConsolidationRun(payload.plantId, currentTurn);
    try {
      await runConsolidationPipeline(payload.plantId, payload.plantName, runTurn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finishConsolidationRun(payload.plantId, runTurn, message);
      throw error;
    }
    const pending = finishConsolidationRun(payload.plantId, runTurn);
    if (pending === null) break;
    currentTurn = pending;
  }
};

export const runSessionClosureJob = async (job: BackgroundJob): Promise<void> => {
  const payload = asPayload(job.payload);
  await runConsolidationPipeline(payload.plantId, payload.plantName, payload.currentTurn, true);
};
