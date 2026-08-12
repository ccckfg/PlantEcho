import type { PlantIntention, RelationshipStage } from "@dyn/shared";
import { intentionConfig } from "../../config/intentions.js";
import { proactiveConfig } from "../../config/proactive.js";
import {
  clockMinutes,
  isMinuteInWindow,
  localTimeContext
} from "../../shared/timezone.js";
import {
  createIntention,
  dismissPendingIntentionsBySourcePrefix
} from "../intentions/intentionRepository.js";
import { getPlantOwnerTimezone } from "./timezoneRepository.js";
import { getTemporalPlantFacts } from "./temporalTriggerRepository.js";

const warmStages = new Set<RelationshipStage>(["信任", "亲近", "相伴"]);

const afterMs = (now: Date, durationMs: number): string =>
  new Date(now.getTime() + durationMs).toISOString();

const localDateKey = (date: Date, timezone: string): string =>
  localTimeContext(date, timezone, proactiveConfig.defaultTimezone).localTime.slice(0, 10);

const createSilenceIntention = async (
  facts: NonNullable<Awaited<ReturnType<typeof getTemporalPlantFacts>>>,
  now: Date
): Promise<PlantIntention | null> => {
  const anchor = facts.latestUserMessageAt ?? facts.adoptedAt;
  const anchorMs = Date.parse(anchor);
  if (!Number.isFinite(anchorMs)) return null;
  const thresholdDays = warmStages.has(facts.relationshipStage)
    ? proactiveConfig.silenceWarmDays
    : proactiveConfig.silenceCoolDays;
  if (now.getTime() - anchorMs < thresholdDays * intentionConfig.dayMs) {
    await dismissPendingIntentionsBySourcePrefix(facts.plantId, "temporal", "silence:");
    return null;
  }
  const anchorId = facts.latestUserMessageId ?? `adopted:${facts.adoptedAt}`;
  const sourceId = `silence:${anchorId}`;
  await dismissPendingIntentionsBySourcePrefix(
    facts.plantId,
    "temporal",
    "silence:",
    sourceId
  );
  return createIntention({
    plantId: facts.plantId,
    kind: "reconnect",
    content: [
      `已经至少 ${thresholdDays} 天没有和主人聊天`,
      `当前关系阶段是${facts.relationshipStage}`,
      "等主人回来且不打扰时，轻轻表示自己还在，不追问、不索取回应"
    ].join("；").slice(0, intentionConfig.contentMaxChars),
    sourceType: "temporal",
    sourceId,
    priority: 1,
    notBefore: null,
    expiresAt: afterMs(now, proactiveConfig.silenceIntentionExpiryMs)
  });
};

const createAnniversaryIntention = async (
  facts: NonNullable<Awaited<ReturnType<typeof getTemporalPlantFacts>>>,
  now: Date,
  timezone: string
): Promise<PlantIntention | null> => {
  const adopted = new Date(facts.adoptedAt);
  if (Number.isNaN(adopted.getTime())) return null;
  const [nowYear, nowMonth, nowDay] = localDateKey(now, timezone).split("-").map(Number);
  const [adoptedYear, adoptedMonth, adoptedDay] = localDateKey(adopted, timezone).split("-").map(Number);
  const years = nowYear - adoptedYear;
  if (years < 1 || nowMonth !== adoptedMonth || nowDay !== adoptedDay) return null;
  return createIntention({
    plantId: facts.plantId,
    kind: "adoption_anniversary",
    content: `${facts.plantName}在 PlantEcho 建立记录满 ${years} 年（以创建日期代理认养日）；可轻轻纪念相伴起点，不断言真实购买日期或虚构往事`,
    sourceType: "temporal",
    sourceId: `adoption-anniversary:${nowYear}`,
    priority: 2,
    notBefore: null,
    expiresAt: afterMs(now, proactiveConfig.anniversaryIntentionExpiryMs)
  });
};

const createMorningIntention = async (
  facts: NonNullable<Awaited<ReturnType<typeof getTemporalPlantFacts>>>,
  now: Date,
  timezone: string
): Promise<PlantIntention | null> => {
  if (!proactiveConfig.morningGreetingEnabled) return null;
  const local = localTimeContext(now, timezone, proactiveConfig.defaultTimezone);
  if (!isMinuteInWindow(local.minuteOfDay, proactiveConfig.morningStart, proactiveConfig.morningEnd)) {
    return null;
  }
  const endMinute = clockMinutes(proactiveConfig.morningEnd);
  const minutesRemaining = (endMinute - local.minuteOfDay + 1_440) % 1_440;
  return createIntention({
    plantId: facts.plantId,
    kind: "morning_greeting",
    content: `当地早晨 ${local.localTime.slice(0, 16)}；可以轻声问早，不虚构天气、日程或主人状态`,
    sourceType: "temporal",
    sourceId: `morning:${local.localTime.slice(0, 10)}`,
    priority: 1,
    notBefore: null,
    expiresAt: afterMs(now, Math.max(1, minutesRemaining) * 60_000)
  });
};

export const generateTemporalIntentions = async (
  plantId: string,
  now = new Date()
): Promise<PlantIntention[]> => {
  const facts = await getTemporalPlantFacts(plantId);
  if (!facts) return [];
  const timezone = await getPlantOwnerTimezone(plantId) ?? proactiveConfig.defaultTimezone;
  const candidates = await Promise.all([
    createSilenceIntention(facts, now),
    createAnniversaryIntention(facts, now, timezone),
    createMorningIntention(facts, now, timezone)
  ]);
  return candidates.filter((item): item is PlantIntention => item !== null);
};
