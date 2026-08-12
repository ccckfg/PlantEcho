import type { EpisodeMemory, PlantIntention } from "@dyn/shared";
import {
  createIntention,
  claimNextReadyIntention
} from "./intentionRepository.js";
import type { InnerPatch } from "../state/stateService.js";
import { proactiveConfig } from "../../config/proactive.js";
import { intentionConfig } from "../../config/intentions.js";
import { stateConfig } from "../../config/state.js";
import { sanitizeInnerPatch } from "../state/statePolicy.js";

const afterDays = (days: number): string =>
  new Date(Date.now() + days * intentionConfig.dayMs).toISOString();
const afterMs = (ms: number): string => new Date(Date.now() + ms).toISOString();

export const createIntentionFromInner = async (
  plantId: string,
  turn: number,
  patch: InnerPatch
): Promise<PlantIntention | null> => {
  const safePatch = sanitizeInnerPatch(patch, {
    mood: stateConfig.moodMaxChars,
    text: stateConfig.innerTextMaxChars
  });
  const content = safePatch.thought?.trim() || safePatch.concern?.trim();
  if (!content) return null;
  return createIntention({
    plantId,
    kind: "continue_topic",
    content: content.slice(0, intentionConfig.contentMaxChars),
    sourceType: "inner",
    sourceId: String(turn),
    priority: safePatch.thought ? 2 : 1,
    notBefore: afterMs(intentionConfig.innerQuietMs),
    expiresAt: afterDays(intentionConfig.innerExpiryDays)
  });
};

export const createIntentionFromEpisode = async (memory: EpisodeMemory): Promise<PlantIntention | null> => {
  if (memory.importance < 4 || memory.sourceType !== "llm:episode") return null;
  return createIntention({
    plantId: memory.plantId,
    kind: "acknowledge_milestone",
    content: `找合适的时候回应这件事：${memory.title}`.slice(0, intentionConfig.contentMaxChars),
    sourceType: "episode",
    sourceId: memory.id,
    priority: memory.importance >= 5 ? 3 : 2,
    notBefore: afterMs(intentionConfig.importantEpisodeQuietMs),
    expiresAt: afterDays(intentionConfig.importantEpisodeExpiryDays)
  });
};

export const createIntentionFromUnderstanding = async (
  plantId: string,
  sourceId: string,
  summary: string
): Promise<PlantIntention | null> => {
  const content = summary.trim();
  if (!content) return null;
  return createIntention({
    plantId,
    kind: "follow_up",
    content: `有合适时机再回应这份理解：${content}`.slice(0, intentionConfig.contentMaxChars),
    sourceType: "understanding",
    sourceId,
    priority: 2,
    notBefore: afterMs(intentionConfig.understandingQuietMs),
    expiresAt: afterDays(intentionConfig.understandingExpiryDays)
  });
};

export const chooseIntentionForConsideration = async (plantId: string): Promise<PlantIntention | null> => {
  return claimNextReadyIntention(plantId, proactiveConfig.intentionClaimMs);
};
