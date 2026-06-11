import { getPlant } from "../plants/plantRepository.js";
import { getLayeredPlantState } from "../state/stateService.js";
import { renderHistory, windowedHistory } from "./historyWindow.js";
import {
  formatMemoriesForPrompt,
  formatUnderstandingsForPrompt,
  retrieveMemories,
  type RetrievedMemory,
  retrieveUnderstandings
} from "../memory/retrieval/retrievalService.js";
import { buildRetrievalQueries } from "../memory/retrieval/queryBuilder.js";
import { memoriesAllowedForPrompt, memoryCitationsForPrompt } from "./memoryCitation.js";
import type { MemoryCitation } from "@dyn/shared";
import { promptDataBlock } from "./promptData.js";
import { latestUserMessageBeforeTurn } from "./messageRepository.js";

export interface ChatContext {
  userMessage: string;
  userPrompt: string;
  retrievedMemories: RetrievedMemory[];
  offeredCitations: MemoryCitation[];
}

interface PromptParts {
  plant: unknown;
  temporalContext: unknown;
  backgroundInfo: unknown;
  careProfile: unknown;
  physicalState: unknown;
  innerState: unknown;
  relationshipState: unknown;
  intentionState: unknown;
  memoryPolicy: unknown;
  relevantUnderstandings: string;
  relevantMemories: string;
  recentHistory: string;
  userMessage: string;
}

const getTimeOfDay = (hour: number): string => {
  if (hour >= 5 && hour < 9) return "清晨";
  if (hour >= 9 && hour < 12) return "上午";
  if (hour >= 12 && hour < 14) return "中午";
  if (hour >= 14 && hour < 18) return "下午";
  if (hour >= 18 && hour < 22) return "晚上";
  return "深夜";
};

const getTimeElapsedDescription = (now: Date, pastStr: string | undefined): string => {
  if (!pastStr) return "第一次和主人聊天";
  const past = new Date(pastStr);
  const diffMs = now.getTime() - past.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "刚聊完不久";
  if (diffMs < 5 * 60 * 1000) return "刚聊完不久";
  if (diffMs < 60 * 60 * 1000) {
    const mins = Math.floor(diffMs / 60000);
    return `${mins}分钟前聊过`;
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}小时前聊过`;
  }
  const days = Math.floor(diffMs / 86400000);
  return `${days}天没有聊天了`;
};

const getSensoryFeelings = (
  reading: any,
  careProfile: any,
  connection: string
) => {
  if (connection === "offline" || !reading) {
    return {
      freshness: "offline",
      moisture: "unknown",
      light: "unknown",
      temperature: "unknown"
    };
  }

  const getStatus = (val: number | null | undefined, min: number, max: number) => {
    if (typeof val !== "number") return "unknown";
    if (val < min) return "below_range";
    if (val > max) return "above_range";
    return "within_range";
  };

  return {
    freshness: "fresh",
    moisture: getStatus(reading.soilPercent, careProfile.soil.min, careProfile.soil.max),
    light: getStatus(reading.lightLux, careProfile.light.minLux, careProfile.light.maxLux),
    temperature: getStatus(reading.airTempC, careProfile.temperature.minC, careProfile.temperature.maxC)
  };
};

const getLocalTimeInTimezone = (
  date: Date,
  timezone: string
): { hour: number; timeStr: string } | null => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const hour = parseInt(partMap.hour, 10);

    const timeStr = new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);

    if (isNaN(hour)) return null;
    return { hour, timeStr };
  } catch {
    return null;
  }
};

export const composeUserPrompt = (parts: PromptParts): string =>
  [
    promptDataBlock("plant", parts.plant),
    promptDataBlock("temporal_context", parts.temporalContext),
    promptDataBlock("plant_background", parts.backgroundInfo),
    promptDataBlock("care_profile", parts.careProfile),
    promptDataBlock("physical_state", parts.physicalState),
    promptDataBlock("inner_state", parts.innerState),
    promptDataBlock("relationship_state", parts.relationshipState),
    promptDataBlock("intention_state", parts.intentionState),
    promptDataBlock("memory_policy", parts.memoryPolicy),
    promptDataBlock("relevant_understandings", parts.relevantUnderstandings),
    promptDataBlock("relevant_memories", parts.relevantMemories),
    promptDataBlock("recent_history", parts.recentHistory),
    promptDataBlock("user_message", parts.userMessage, "current-user-message")
  ].join("\n\n---\n\n");

export const buildChatContext = async (
  plantId: string,
  userMessage: string,
  currentTurn?: number,
  timezone?: string
): Promise<ChatContext> => {
  const plant = await getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const state = await getLayeredPlantState(plantId);
  const historyMessages = await windowedHistory(plantId, currentTurn);
  const queries = buildRetrievalQueries(userMessage, {
    focus: [state.inner.concern, state.inner.thought].filter(Boolean).join(" "),
    relationship: `${state.relationship.stage} ${state.relationship.summary}`
  }, historyMessages);
  const memories = await retrieveMemories(plantId, queries.episode, queries.episodeBm25);
  const offeredCitations = memoryCitationsForPrompt(userMessage, memories);
  const promptMemories = memoriesAllowedForPrompt(memories, offeredCitations);
  const understandings = await retrieveUnderstandings(
    plantId,
    queries.understanding,
    queries.understandingBm25
  );
  const history = renderHistory(historyMessages);

  // Calculate elapsed time from the last user message before the current turn
  const lastUserMsg = currentTurn !== undefined
    ? await latestUserMessageBeforeTurn(plantId, currentTurn)
    : null;
  const now = new Date();

  let temporalContext: Record<string, string> = {
    timeSinceUserSpoke: getTimeElapsedDescription(now, lastUserMsg?.createdAt)
  };

  if (timezone) {
    const local = getLocalTimeInTimezone(now, timezone);
    if (local) {
      temporalContext = {
        ...temporalContext,
        currentTime: local.timeStr,
        timeOfDay: getTimeOfDay(local.hour)
      };
    }
  }

  const userPrompt = composeUserPrompt({
    plant: { name: plant.name, species: plant.species, location: plant.location },
    temporalContext,
    backgroundInfo: plant.backgroundInfo || "主人还没有为我写下额外的背景与性格。",
    careProfile: plant.careProfile,
    physicalState: {
      connection: state.physical.connection,
      sensoryFeelings: getSensoryFeelings(state.physical.reading, plant.careProfile, state.physical.connection),
      lastReadingAt: state.physical.lastReadingAt,
      rawReading: state.physical.reading,
      careProfile: state.physical.careProfile,
      ruleReferenceAdvisory: {
        facts: state.physical.facts,
        issues: state.physical.issues,
        note: "这是仅按原始读数与范围比较生成的参考；背景信息与近期对话可能说明特殊情况。"
      }
    },
    innerState: state.inner,
    relationshipState: state.relationship,
    intentionState: state.intentions.length
      ? state.intentions.map((item) => ({
          ...item,
          note: "只是悬着的念头，不要求现在说"
        }))
      : [],
    memoryPolicy: {
      mayReferencePastMemory: offeredCitations.length > 0,
      maxReferences: offeredCitations.length ? 1 : 0,
      offeredCitations
    },
    relevantUnderstandings: formatUnderstandingsForPrompt(understandings),
    relevantMemories: formatMemoriesForPrompt(promptMemories),
    recentHistory: history || "暂无近期对话",
    userMessage
  });

  return {
    userMessage,
    userPrompt,
    retrievedMemories: memories,
    offeredCitations
  };
};
