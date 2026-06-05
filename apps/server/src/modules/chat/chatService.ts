import { plantSystemPrompt } from "./prompts.js";
import { completeChat, isLlmConfigured, streamChat, type LlmChatOptions } from "../llm/client.js";
import { addMessage, nextTurn } from "./messageRepository.js";
import { buildChatContext } from "./promptBuilder.js";
import { getPlant } from "../plants/plantRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { updatePlantStatus } from "../plants/statusRepository.js";
import { rememberUserMessage } from "../memory/consolidation/ruleConsolidator.js";
import { scheduleDetectAndConsolidate } from "../memory/consolidation/consolidationJob.js";
import { addReminderConfirmation, scheduleReminderFromText } from "../proactive/reminderService.js";
import { memoryConfig } from "../../config/memory.js";
import { getSensorTrust } from "../readings/sensorTrust.js";
import {
  citationsUsedByReply,
  repairUnsupportedMemoryClaim
} from "./memoryCitation.js";
import { limitPlantReply, replyCharLimit } from "./replyStyle.js";
import type { MemoryCitation } from "@dyn/shared";

export interface ChatResult {
  turn: number;
  reply: string;
  usedLlm: boolean;
  usedMemoryIds: string[];
  memoryCitations: MemoryCitation[];
  llmError?: string;
}

export interface ChatWithPlantOptions extends LlmChatOptions {}

export type ChatStreamEvent =
  | { type: "meta"; turn: number }
  | { type: "delta"; delta: string }
  | {
      type: "done";
      turn: number;
      usedLlm: boolean;
      usedMemoryIds: string[];
      memoryCitations: MemoryCitation[];
      llmError?: string;
    };

export const chatWithPlant = async (
  plantId: string,
  content: string,
  options?: ChatWithPlantOptions
): Promise<ChatResult> => {
  const { turn, userMessageId, context, fallback } = await prepareChatTurn(plantId, content);
  let reply = fallback;
  let usedLlm = false;
  let llmError: string | undefined;
  try {
    if (!isLlmConfigured(options)) {
      throw new Error("LLM_NOT_CONFIGURED");
    }
    const llmReply = await completeChat([
      { role: "system", content: plantSystemPrompt },
      { role: "user", content: context.userPrompt }
    ], options);
    if (llmReply) {
      reply = llmReply;
      usedLlm = true;
    }
  } catch (error) {
    llmError = sanitizeLlmError(error);
    console.warn(`[chat] fallback for ${plantId} turn ${turn}: ${llmError}`);
    reply = fallback;
  }
  reply = limitPlantReply(
    repairUnsupportedMemoryClaim(reply, context.offeredCitations),
    content
  );
  const memoryCitations = citationsUsedByReply(reply, context.offeredCitations);
  finishChatTurn(plantId, turn, content, reply);
  const reminder = scheduleReminderFromText(plantId, content, userMessageId);
  if (reminder) addReminderConfirmation(plantId, reminder);
  return {
    turn,
    reply,
    usedLlm,
    usedMemoryIds: memoryCitations.map((item) => item.id),
    memoryCitations,
    ...(usedLlm ? {} : { llmError })
  };
};

export async function* streamChatWithPlant(
  plantId: string,
  content: string,
  options?: ChatWithPlantOptions
): AsyncGenerator<ChatStreamEvent> {
  const { turn, userMessageId, context, fallback } = await prepareChatTurn(plantId, content);
  yield { type: "meta", turn };

  let reply = "";
  let emittedChars = 0;
  const maxReplyChars = replyCharLimit(content);
  let usedLlm = false;
  let llmError: string | undefined;
  try {
    if (!isLlmConfigured(options)) {
      throw new Error("LLM_NOT_CONFIGURED");
    }
    for await (const delta of streamChat([
      { role: "system", content: plantSystemPrompt },
      { role: "user", content: context.userPrompt }
    ], options)) {
      const remaining = maxReplyChars - emittedChars;
      const visibleDelta = remaining > 0
        ? Array.from(delta).slice(0, remaining).join("")
        : "";
      reply += visibleDelta;
      emittedChars += Array.from(visibleDelta).length;
      usedLlm = true;
      if (visibleDelta) yield { type: "delta", delta: visibleDelta };
    }
    if (!reply.trim()) throw new Error("LLM_STREAM_EMPTY");
  } catch (error) {
    llmError = sanitizeLlmError(error);
    console.warn(`[chat] stream fallback for ${plantId} turn ${turn}: ${llmError}`);
    if (!reply.trim()) {
      reply = limitPlantReply(fallback, content);
      yield { type: "delta", delta: reply };
    }
  }

  reply = limitPlantReply(
    repairUnsupportedMemoryClaim(reply, context.offeredCitations),
    content
  );
  const memoryCitations = citationsUsedByReply(reply, context.offeredCitations);
  finishChatTurn(plantId, turn, content, reply);
  const reminder = scheduleReminderFromText(plantId, content, userMessageId);
  if (reminder) addReminderConfirmation(plantId, reminder);
  yield {
    type: "done",
    turn,
    usedLlm,
    usedMemoryIds: memoryCitations.map((item) => item.id),
    memoryCitations,
    ...(usedLlm ? {} : { llmError })
  };
}

const prepareChatTurn = async (plantId: string, content: string) => {
  const turn = nextTurn(plantId);
  const userMessage = addMessage(plantId, turn, "user", content);
  rememberUserMessage(plantId, turn, content);
  const context = await buildChatContext(plantId, content);
  return {
    turn,
    userMessageId: userMessage.id,
    context,
    fallback: buildFallbackReply(plantId, content, context.topMemoryText)
  };
};

const finishChatTurn = (plantId: string, turn: number, content: string, reply: string): void => {
  const assistant = addMessage(plantId, turn, "assistant", reply);
  updatePlantStatus(plantId, { focus: content.slice(0, 80) });
  publishSyncEvent({
    type: "messages.changed",
    plantId,
    payload: { turn, messageId: assistant.id }
  });
  const plant = getPlant(plantId);
  if (plant && turn % memoryConfig.conversationConsolidationIntervalTurns === 0) {
    scheduleDetectAndConsolidate(plantId, plant.name, turn);
  }
};

const briefFollowUpPattern = /^(真的?吗|真的吗|真的|[?？]{1,3}|嗯\??|啊\??|然后呢|为什么)$/i;
const statusIntentPattern = /(状态|读数|湿度|光照|温度|怎么样|还好吗|舒服|健康|缺水|渴|晒|热|冷)/;
const memoryIntentPattern = /(记得|记忆|之前|上次|刚才|为什么这么说)/;

const sanitizeLlmError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 500);
};

const buildFallbackReply = (
  plantId: string,
  userMessage: string,
  memoryTitle: string
): string => {
  const state = getPlantReadingState(plantId);
  const sensorTrust = getSensorTrust(plantId);
  const issue = state.health.issues[0];
  const facts = state.health.facts.length ? state.health.facts.join("，") : "暂无传感器数据";
  const wantsStatus = statusIntentPattern.test(userMessage);
  const wantsMemory = memoryIntentPattern.test(userMessage);
  const isBriefFollowUp = briefFollowUpPattern.test(userMessage.trim());
  const isSensorOffline = issue?.code === "sensor_offline";

  if (!sensorTrust.trusted) {
    if (wantsStatus) return "你说过这些读数现在不可信。那我先不拿它们说身体的事。";
    return wantsMemory && memoryTitle
      ? `我记得「${memoryTitle}」留下的那一点。`
      : "我听见了。先让它在叶子底下待一会儿。";
  }

  if (isBriefFollowUp) {
    if (issue) {
      return `嗯。刚才的读数里有${issue.label}。先等等下一轮。`;
    }
    return "嗯。至少这一刻，我没有乱猜。";
  }

  const memory = wantsMemory && memoryTitle ? `我记得「${memoryTitle}」留下的那一点。` : "";
  if (issue && wantsStatus) {
    if (isSensorOffline) return "我现在听不清自己的身体。最后一次读数，先别当成此刻。";
    return `现在有一点${issue.label}。不急，先看看它会不会自己缓下来。`;
  }
  if (wantsStatus) {
    return `现在挺安稳。你要数字的话，是：${facts}。`;
  }
  return memory || "我听见了。先让它在叶子底下待一会儿。";
};
