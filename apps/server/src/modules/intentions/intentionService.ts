import type { EpisodeMemory, PlantIntention } from "@dyn/shared";
import {
  createIntention,
  listPendingIntentions,
  updateIntentionStatus
} from "./intentionRepository.js";
import type { InnerPatch } from "../state/stateService.js";
import { proactiveConfig } from "../../config/proactive.js";
import { intentionConfig } from "../../config/intentions.js";
import { stateConfig } from "../../config/state.js";
import { sanitizeInnerPatch, sanitizeStateText } from "../state/statePolicy.js";

const afterDays = (days: number): string =>
  new Date(Date.now() + days * intentionConfig.dayMs).toISOString();
const afterMs = (ms: number): string => new Date(Date.now() + ms).toISOString();

const quietMsBySource = (sourceType: PlantIntention["sourceType"]): number => ({
  user: intentionConfig.agreementQuietMs,
  inner: intentionConfig.innerQuietMs,
  episode: intentionConfig.importantEpisodeQuietMs,
  understanding: intentionConfig.understandingQuietMs
})[sourceType];

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

export const createIntentionFromUserMessage = async (
  plantId: string,
  turn: number,
  message: string
): Promise<PlantIntention | null> => {
  const match = message.match(/(?:下次|以后|改天|回头)(?:再)?(.{2,80})/);
  const content = sanitizeStateText(
    match?.[1]?.replace(/[。！？!?]+$/, "").trim(),
    intentionConfig.contentMaxChars
  );
  if (!content) return null;
  return createIntention({
    plantId,
    kind: "follow_up",
    content: `以后自然地接住这件事：${content}`,
    sourceType: "user",
    sourceId: String(turn),
    priority: 1,
    notBefore: afterMs(intentionConfig.agreementQuietMs),
    expiresAt: afterDays(intentionConfig.agreementExpiryDays)
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
  const now = Date.now();
  const dailyCutoff = Date.now() - proactiveConfig.intentionConsiderationCooldownMs;
  for (const item of await listPendingIntentions(plantId, 10)) {
    const safeContent = item.sourceType === "inner"
      ? sanitizeInnerPatch(
          { thought: item.content },
          { mood: stateConfig.moodMaxChars, text: intentionConfig.contentMaxChars }
        ).thought
      : sanitizeStateText(item.content, intentionConfig.contentMaxChars);
    if (!safeContent) {
      await updateIntentionStatus(item.id, "dismissed");
      continue;
    }
    if (
      item.consideredCount < proactiveConfig.intentionMaxConsiderations &&
      new Date(item.createdAt).getTime() + quietMsBySource(item.sourceType) <= now &&
      (!item.lastConsideredAt || new Date(item.lastConsideredAt).getTime() <= dailyCutoff)
    ) return item;
  }
  return null;
};
