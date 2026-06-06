import {
  relationshipStages,
  type InnerState,
  type LayeredPlantState,
  type PhysicalState,
  type RelationshipStage,
  type RelationshipState
} from "@dyn/shared";
import { getPlant } from "../plants/plantRepository.js";
import { getLatestReading } from "../readings/readingRepository.js";
import { isReadingOffline } from "../readings/freshness.js";
import { evaluateReading } from "../readings/rules.js";
import { listPendingIntentions } from "../intentions/intentionRepository.js";
import {
  getInnerState,
  getRelationshipState,
  upsertInnerState,
  upsertRelationshipState
} from "./stateRepository.js";
import { stateConfig } from "../../config/state.js";
import {
  changedInnerPatch,
  sanitizeInnerPatch,
  sanitizeStateText,
  sanitizeStoredInner
} from "./statePolicy.js";

export interface InnerPatch {
  mood?: string;
  concern?: string;
  thought?: string;
}

export interface RelationshipPatch {
  stage?: RelationshipStage;
  summary?: string;
}

export interface RelationshipPatchResult {
  state: RelationshipState;
  changed: boolean;
}

export interface InnerPatchResult {
  state: InnerState;
  changed: boolean;
  appliedPatch: InnerPatch;
}

const innerLimits = { mood: stateConfig.moodMaxChars, text: stateConfig.innerTextMaxChars };

export const getSafeInnerState = (plantId: string): InnerState => {
  const current = getInnerState(plantId);
  const safe = sanitizeStoredInner(current, innerLimits);
  if (
    safe.mood === current.mood &&
    safe.concern === current.concern &&
    safe.thought === current.thought
  ) return current;
  return upsertInnerState(plantId, { ...safe, sourceTurn: current.sourceTurn });
};

export const getSafeRelationshipState = (plantId: string): RelationshipState => {
  const current = getRelationshipState(plantId);
  const summary =
    sanitizeStateText(current.summary, stateConfig.relationshipSummaryMaxChars) ??
    "刚刚认识主人";
  if (summary === current.summary) return current;
  return upsertRelationshipState(plantId, {
    stage: current.stage,
    summary,
    evidenceMemoryIds: current.evidenceMemoryIds
  });
};

export const getPhysicalState = (plantId: string): PhysicalState => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const latest = getLatestReading(plantId);
  const health = evaluateReading(plant.careProfile, latest);
  const connection = latest && !isReadingOffline(latest) ? "online" : "offline";
  return {
    connection,
    reading: latest && connection === "online"
      ? {
          soilRaw: latest.soilRaw,
          soilPercent: latest.soilPercent,
          airTempC: latest.airTempC,
          airHumidityPercent: latest.airHumidityPercent,
          lightLux: latest.lightLux,
          rssi: latest.rssi,
          batteryMv: latest.batteryMv
        }
      : null,
    careProfile: plant.careProfile,
    ...health,
    lastReadingAt: latest?.capturedAt ?? null
  };
};

export const getLayeredPlantState = (plantId: string): LayeredPlantState => ({
  physical: getPhysicalState(plantId),
  inner: getSafeInnerState(plantId),
  relationship: getSafeRelationshipState(plantId),
  intentions: listPendingIntentions(plantId, 3)
});

export const applyInnerPatch = (
  plantId: string,
  sourceTurn: number,
  patch: InnerPatch
): InnerPatchResult => {
  const current = getSafeInnerState(plantId);
  if (current.sourceTurn !== null && sourceTurn <= current.sourceTurn) {
    return { state: current, changed: false, appliedPatch: {} };
  }
  const safePatch = sanitizeInnerPatch(patch, innerLimits);
  const appliedPatch = changedInnerPatch(current, safePatch);
  if (
    appliedPatch.mood === undefined &&
    appliedPatch.concern === undefined &&
    appliedPatch.thought === undefined
  ) {
    return { state: current, changed: false, appliedPatch: {} };
  }
  const next = {
    mood: appliedPatch.mood ?? current.mood,
    concern: appliedPatch.concern ?? current.concern,
    thought: appliedPatch.thought ?? current.thought
  };
  const state = upsertInnerState(plantId, {
    ...next,
    sourceTurn
  });
  return { state, changed: true, appliedPatch };
};

export const applyRelationshipPatch = (
  plantId: string,
  memoryId: string,
  patch: RelationshipPatch
): RelationshipPatchResult => {
  const current = getSafeRelationshipState(plantId);
  const currentIndex = relationshipStages.indexOf(current.stage);
  const requestedIndex = patch.stage && relationshipStages.includes(patch.stage)
    ? relationshipStages.indexOf(patch.stage)
    : currentIndex;
  const stage = relationshipStages[
    Math.max(currentIndex, Math.min(currentIndex + 1, requestedIndex))
  ] ?? current.stage;
  const summary =
    sanitizeStateText(patch.summary, stateConfig.relationshipSummaryMaxChars) ?? current.summary;
  if (stage === current.stage && summary === current.summary) {
    return { state: current, changed: false };
  }
  const state = upsertRelationshipState(plantId, {
    stage,
    summary,
    evidenceMemoryIds: [...new Set([...current.evidenceMemoryIds, memoryId])]
      .slice(-stateConfig.relationshipEvidenceLimit)
  });
  return { state, changed: true };
};

export const hasMeaningfulRelationshipPatch = (patch: RelationshipPatch | undefined): boolean =>
  Boolean(
    patch &&
    (
      (patch.stage && relationshipStages.includes(patch.stage)) ||
      sanitizeStateText(patch.summary, stateConfig.relationshipSummaryMaxChars)
    )
  );
