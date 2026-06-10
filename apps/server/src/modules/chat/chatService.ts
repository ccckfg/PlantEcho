import { plantSystemPrompt } from "./prompts.js";
import { completeChat, streamChat, type LlmChatOptions } from "../llm/client.js";
import { addMessage, nextTurn } from "./messageRepository.js";
import { buildChatContext } from "./promptBuilder.js";
import { getPlant } from "../plants/plantRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { rememberUserMessage } from "../memory/consolidation/ruleConsolidator.js";
import {
  scheduleDetectAndConsolidate,
  scheduleSessionClosure
} from "../memory/consolidation/consolidationJob.js";
import { addReminderConfirmation } from "../proactive/reminderService.js";
import { scheduleReminderFromUserMessage } from "../proactive/reminderTool.js";
import {
  citationsUsedByReply,
  repairUnsupportedMemoryClaim,
  UnsupportedMemoryClaimFilter
} from "./memoryCitation.js";
import { limitPlantReply } from "./replyStyle.js";
import type { MemoryCitation } from "@dyn/shared";
import { parseChatResponse, VisibleReplyFilter } from "./responseProtocol.js";
import { applyInnerPatch, type InnerPatch } from "../state/stateService.js";
import {
  createIntentionFromInner,
  createIntentionFromUserMessage
} from "../intentions/intentionService.js";
import { assertChatDependencies } from "./chatRequirements.js";
import { llmPhases } from "../../config/llmRouting.js";

export interface ChatResult {
  turn: number;
  reply: string;
  usedLlm: boolean;
  usedMemoryIds: string[];
  memoryCitations: MemoryCitation[];
}

export interface ChatWithPlantOptions extends LlmChatOptions {
  timezone?: string;
  visibleTo?: string[];
  publishMessagesChanged?: boolean;
}

export type ChatStreamEvent =
  | { type: "meta"; turn: number }
  | { type: "delta"; delta: string }
  | {
      type: "done";
      turn: number;
      usedLlm: boolean;
      usedMemoryIds: string[];
      memoryCitations: MemoryCitation[];
    };

export const chatWithPlant = async (
  plantId: string,
  content: string,
  options?: ChatWithPlantOptions
): Promise<ChatResult> => {
  assertChatDependencies(options);
  const { turn, userMessageId, context } = await prepareChatTurn(plantId, content, options);
  const llmReply = await completeChat([
    { role: "system", content: plantSystemPrompt },
    { role: "user", content: context.userPrompt }
  ], { ...options, phase: llmPhases.chatReply });
  if (!llmReply) throw new Error("LLM returned an empty chat response");
  const parsed = parseChatResponse(llmReply);
  let reply = parsed.reply;
  if (!reply.trim()) throw new Error("LLM returned an empty visible reply");
  reply = limitPlantReply(
    repairUnsupportedMemoryClaim(reply, context.offeredCitations),
    content
  );
  const memoryCitations = citationsUsedByReply(reply, context.offeredCitations);
  finishChatTurn(plantId, turn, reply, parsed.innerPatch, options);
  const reminder = await scheduleReminderFromUserMessage(
    plantId,
    content,
    userMessageId,
    options?.timezone
  );
  if (reminder) {
    addReminderConfirmation(plantId, reminder, {
      visibleTo: options?.visibleTo,
      publishMessagesChanged: options?.publishMessagesChanged
    });
  }
  return {
    turn,
    reply,
    usedLlm: true,
    usedMemoryIds: memoryCitations.map((item) => item.id),
    memoryCitations
  };
};

export async function* streamChatWithPlant(
  plantId: string,
  content: string,
  options?: ChatWithPlantOptions
): AsyncGenerator<ChatStreamEvent> {
  assertChatDependencies(options);
  const { turn, userMessageId, context } = await prepareChatTurn(plantId, content, options);
  yield { type: "meta", turn };

  let reply = "";
  let rawReply = "";
  let innerPatch: InnerPatch = {};
  const visibleFilter = new VisibleReplyFilter();
  const memoryClaimFilter = new UnsupportedMemoryClaimFilter(context.offeredCitations);
  for await (const delta of streamChat([
    { role: "system", content: plantSystemPrompt },
    { role: "user", content: context.userPrompt }
  ], { ...options, phase: llmPhases.chatReply })) {
    rawReply += delta;
    const visible = memoryClaimFilter.feed(visibleFilter.feed(delta));
    if (visible) {
      reply += visible;
      yield { type: "delta", delta: visible };
    }
  }
  const parsed = parseChatResponse(rawReply);
  innerPatch = parsed.innerPatch;
  const tail = memoryClaimFilter.feed(visibleFilter.finish()) + memoryClaimFilter.finish();
  if (tail) {
    reply += tail;
    yield { type: "delta", delta: tail };
  }
  if (!reply.trim()) throw new Error("LLM returned an empty visible stream reply");

  reply = limitPlantReply(
    repairUnsupportedMemoryClaim(reply, context.offeredCitations),
    content
  );
  const memoryCitations = citationsUsedByReply(reply, context.offeredCitations);
  finishChatTurn(plantId, turn, reply, innerPatch, options);
  const reminder = await scheduleReminderFromUserMessage(
    plantId,
    content,
    userMessageId,
    options?.timezone
  );
  if (reminder) {
    addReminderConfirmation(plantId, reminder, {
      visibleTo: options?.visibleTo,
      publishMessagesChanged: options?.publishMessagesChanged
    });
  }
  yield {
    type: "done",
    turn,
    usedLlm: true,
    usedMemoryIds: memoryCitations.map((item) => item.id),
    memoryCitations
  };
}

const prepareChatTurn = async (plantId: string, content: string, options?: ChatWithPlantOptions) => {
  const turn = nextTurn(plantId);
  const userMessage = addMessage(plantId, turn, "user", content, options?.visibleTo ?? [plantId]);
  rememberUserMessage(plantId, turn, content);
  createIntentionFromUserMessage(plantId, turn, content);
  const context = await buildChatContext(plantId, content, turn, options?.timezone);
  return {
    turn,
    userMessageId: userMessage.id,
    context
  };
};

const finishChatTurn = (
  plantId: string,
  turn: number,
  reply: string,
  innerPatch: InnerPatch,
  options?: ChatWithPlantOptions
): void => {
  const visibleTo = options?.visibleTo ?? [plantId];
  const assistant = addMessage(plantId, turn, "assistant", reply, visibleTo);
  const innerResult = applyInnerPatch(plantId, turn, innerPatch);
  if (innerResult.changed) {
    createIntentionFromInner(plantId, turn, innerResult.appliedPatch);
  }
  if (options?.publishMessagesChanged !== false) {
    publishSyncEvent({
      type: "messages.changed",
      plantId,
      payload: { turn, messageId: assistant.id }
    });
  }
  const plant = getPlant(plantId);
  if (plant) {
    scheduleDetectAndConsolidate(plantId, plant.name, turn);
    scheduleSessionClosure(plantId, plant.name, turn);
  }
};
