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
import {
  citationsUsedByReply,
  repairUnsupportedMemoryClaim
} from "./memoryCitation.js";
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
  reply = repairUnsupportedMemoryClaim(reply, context.offeredCitations);
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
      reply += delta;
      usedLlm = true;
      yield { type: "delta", delta };
    }
    if (!reply.trim()) throw new Error("LLM_STREAM_EMPTY");
  } catch (error) {
    llmError = sanitizeLlmError(error);
    console.warn(`[chat] stream fallback for ${plantId} turn ${turn}: ${llmError}`);
    if (!reply.trim()) {
      reply = fallback;
      yield { type: "delta", delta: fallback };
    }
  }

  reply = repairUnsupportedMemoryClaim(reply, context.offeredCitations);
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
  if (plant) scheduleDetectAndConsolidate(plantId, plant.name, turn);
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
  const issue = state.health.issues[0];
  const facts = state.health.facts.length ? state.health.facts.join("，") : "暂无传感器数据";
  const wantsStatus = statusIntentPattern.test(userMessage);
  const wantsMemory = memoryIntentPattern.test(userMessage);
  const isBriefFollowUp = briefFollowUpPattern.test(userMessage.trim());
  const isSensorOffline = issue?.code === "sensor_offline";

  if (isBriefFollowUp) {
    if (issue) {
      return `是真的，我是按刚才的传感器读数判断的：${issue.label}，${issue.detail}。如果你愿意，我们先观察下一两轮读数，别急着处理。`;
    }
    return "是真的。按当前传感器读数看，整体在建议范围内；我不会把你没告诉我的事当成事实。";
  }

  const memory = wantsMemory && memoryTitle ? `我也会参考之前的「${memoryTitle}」。` : "";
  if (issue) {
    if (isSensorOffline && !wantsStatus && !wantsMemory) {
      return `${memory}我听到了，先把这件事记下。等你想看环境状态时，我再单独说明当前读数。`;
    }
    const reading = wantsStatus ? `当前读数是：${facts}。` : "";
    return `${reading}${memory}我现在比较在意${issue.label}，${issue.detail}。可以先看一下摆放位置和土壤状态，我们慢慢调。`;
  }
  if (wantsStatus) {
    return `当前读数是：${facts}。现在整体还舒服。`;
  }
  return `${memory}我听到了。当前环境读数整体稳定；如果你想看具体状态，我可以再把水分、光照和温湿度告诉你。`;
};
