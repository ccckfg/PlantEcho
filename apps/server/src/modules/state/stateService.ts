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

export interface InnerPatch {
  mood?: string;
  concern?: string;
  thought?: string;
}

export interface RelationshipPatch {
  stage?: RelationshipStage;
  summary?: string;
}

const clean = (value: string | undefined, limit: number): string | undefined => {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, limit) : undefined;
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
  inner: getInnerState(plantId),
  relationship: getRelationshipState(plantId),
  intentions: listPendingIntentions(plantId, 3)
});

export const applyInnerPatch = (
  plantId: string,
  sourceTurn: number,
  patch: InnerPatch
): InnerState => {
  const current = getInnerState(plantId);
  if (patch.mood === undefined && patch.concern === undefined && patch.thought === undefined) {
    return current;
  }
  return upsertInnerState(plantId, {
    mood: clean(patch.mood, stateConfig.moodMaxChars) ?? current.mood,
    concern: patch.concern === "" ? "" : clean(patch.concern, stateConfig.innerTextMaxChars) ?? current.concern,
    thought: patch.thought === "" ? "" : clean(patch.thought, stateConfig.innerTextMaxChars) ?? current.thought,
    sourceTurn
  });
};

export const applyRelationshipPatch = (
  plantId: string,
  memoryId: string,
  patch: RelationshipPatch
): RelationshipState => {
  const current = getRelationshipState(plantId);
  const currentIndex = relationshipStages.indexOf(current.stage);
  const requestedIndex = patch.stage ? relationshipStages.indexOf(patch.stage) : currentIndex;
  const stage = relationshipStages[
    Math.max(currentIndex, Math.min(currentIndex + 1, requestedIndex))
  ] ?? current.stage;
  return upsertRelationshipState(plantId, {
    stage,
    summary: clean(patch.summary, stateConfig.relationshipSummaryMaxChars) ?? current.summary,
    evidenceMemoryIds: [...new Set([...current.evidenceMemoryIds, memoryId])]
      .slice(-stateConfig.relationshipEvidenceLimit)
  });
};
