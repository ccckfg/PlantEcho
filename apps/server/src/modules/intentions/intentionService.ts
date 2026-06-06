import type { EpisodeMemory, PlantIntention } from "@dyn/shared";
import { createIntention, listPendingIntentions } from "./intentionRepository.js";
import type { InnerPatch } from "../state/stateService.js";
import { proactiveConfig } from "../../config/proactive.js";
import { intentionConfig } from "../../config/intentions.js";

const afterDays = (days: number): string =>
  new Date(Date.now() + days * intentionConfig.dayMs).toISOString();

export const createIntentionFromInner = (
  plantId: string,
  turn: number,
  patch: InnerPatch
): PlantIntention | null => {
  const content = patch.thought?.trim() || patch.concern?.trim();
  if (!content) return null;
  return createIntention({
    plantId,
    kind: "continue_topic",
    content: content.slice(0, intentionConfig.contentMaxChars),
    sourceType: "inner",
    sourceId: String(turn),
    priority: patch.thought ? 2 : 1,
    notBefore: null,
    expiresAt: afterDays(intentionConfig.innerExpiryDays)
  });
};

export const createIntentionFromEpisode = (memory: EpisodeMemory): PlantIntention | null => {
  if (memory.importance < 4 || memory.sourceType !== "llm:episode") return null;
  return createIntention({
    plantId: memory.plantId,
    kind: "acknowledge_milestone",
    content: `找合适的时候回应这件事：${memory.title}`.slice(0, intentionConfig.contentMaxChars),
    sourceType: "episode",
    sourceId: memory.id,
    priority: memory.importance >= 5 ? 3 : 2,
    notBefore: null,
    expiresAt: afterDays(intentionConfig.importantEpisodeExpiryDays)
  });
};

export const createIntentionFromUserMessage = (
  plantId: string,
  turn: number,
  message: string
): PlantIntention | null => {
  const match = message.match(/(?:下次|以后|改天|回头)(?:再)?(.{2,80})/);
  const content = match?.[1]?.replace(/[。！？!?]+$/, "").trim();
  if (!content) return null;
  return createIntention({
    plantId,
    kind: "follow_up",
    content: `以后自然地接住这件事：${content}`,
    sourceType: "user",
    sourceId: String(turn),
    priority: 1,
    notBefore: null,
    expiresAt: afterDays(intentionConfig.agreementExpiryDays)
  });
};

export const createIntentionFromUnderstanding = (
  plantId: string,
  sourceId: string,
  summary: string
): PlantIntention | null => {
  const content = summary.trim();
  if (!content) return null;
  return createIntention({
    plantId,
    kind: "follow_up",
    content: `有合适时机再回应这份理解：${content}`.slice(0, intentionConfig.contentMaxChars),
    sourceType: "understanding",
    sourceId,
    priority: 2,
    notBefore: null,
    expiresAt: afterDays(intentionConfig.understandingExpiryDays)
  });
};

export const chooseIntentionForConsideration = (plantId: string): PlantIntention | null => {
  const dailyCutoff = Date.now() - proactiveConfig.intentionConsiderationCooldownMs;
  return listPendingIntentions(plantId, 10).find((item) =>
    item.consideredCount < proactiveConfig.intentionMaxConsiderations &&
    (!item.lastConsideredAt || new Date(item.lastConsideredAt).getTime() <= dailyCutoff)
  ) ?? null;
};
