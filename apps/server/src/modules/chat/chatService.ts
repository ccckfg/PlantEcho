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
import { addReminderConfirmation, scheduleReminderFromText } from "../proactive/reminderService.js";
import {
  citationsUsedByReply,
  repairUnsupportedMemoryClaim,
  UnsupportedMemoryClaimFilter
} from "./memoryCitation.js";
import { limitPlantReply, replyCharLimit } from "./replyStyle.js";
import type { MemoryCitation } from "@dyn/shared";
import { parseChatResponse, VisibleReplyFilter } from "./responseProtocol.js";
import { applyInnerPatch, type InnerPatch } from "../state/stateService.js";
import {
  createIntentionFromInner,
  createIntentionFromUserMessage
} from "../intentions/intentionService.js";
import { assertChatDependencies } from "./chatRequirements.js";

export interface ChatResult {
  turn: number;
  reply: string;
  usedLlm: boolean;
  usedMemoryIds: string[];
  memoryCitations: MemoryCitation[];
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
    };

export const chatWithPlant = async (
  plantId: string,
  content: string,
  options?: ChatWithPlantOptions
): Promise<ChatResult> => {
  assertChatDependencies(options);
  const { turn, userMessageId, context } = await prepareChatTurn(plantId, content);
  const llmReply = await completeChat([
    { role: "system", content: plantSystemPrompt },
    { role: "user", content: context.userPrompt }
  ], { ...options, phase: "chat.reply" });
  if (!llmReply) throw new Error("LLM returned an empty chat response");
  const parsed = parseChatResponse(llmReply);
  let reply = parsed.reply;
  if (!reply.trim()) throw new Error("LLM returned an empty visible reply");
  reply = limitPlantReply(
    repairUnsupportedMemoryClaim(reply, context.offeredCitations),
    content
  );
  const memoryCitations = citationsUsedByReply(reply, context.offeredCitations);
  finishChatTurn(plantId, turn, reply, parsed.innerPatch);
  const reminder = scheduleReminderFromText(plantId, content, userMessageId);
  if (reminder) addReminderConfirmation(plantId, reminder);
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
  const { turn, userMessageId, context } = await prepareChatTurn(plantId, content);
  yield { type: "meta", turn };

  let reply = "";
  let rawReply = "";
  let innerPatch: InnerPatch = {};
  const visibleFilter = new VisibleReplyFilter();
  const memoryClaimFilter = new UnsupportedMemoryClaimFilter(context.offeredCitations);
  const maxReplyChars = replyCharLimit(content);
  let emittedChars = 0;
  for await (const delta of streamChat([
    { role: "system", content: plantSystemPrompt },
    { role: "user", content: context.userPrompt }
  ], { ...options, phase: "chat.reply" })) {
    rawReply += delta;
    const visible = memoryClaimFilter.feed(visibleFilter.feed(delta));
    const remaining = maxReplyChars - emittedChars;
    const clipped = remaining > 0 ? Array.from(visible).slice(0, remaining).join("") : "";
    if (clipped) {
      reply += clipped;
      emittedChars += Array.from(clipped).length;
      yield { type: "delta", delta: clipped };
    }
  }
  const parsed = parseChatResponse(rawReply);
  innerPatch = parsed.innerPatch;
  const tail = memoryClaimFilter.feed(visibleFilter.finish()) + memoryClaimFilter.finish();
  const remaining = maxReplyChars - emittedChars;
  const clippedTail = remaining > 0 ? Array.from(tail).slice(0, remaining).join("") : "";
  if (clippedTail) {
    reply += clippedTail;
    yield { type: "delta", delta: clippedTail };
  }
  if (!reply.trim()) throw new Error("LLM returned an empty visible stream reply");

  reply = limitPlantReply(
    repairUnsupportedMemoryClaim(reply, context.offeredCitations),
    content
  );
  const memoryCitations = citationsUsedByReply(reply, context.offeredCitations);
  finishChatTurn(plantId, turn, reply, innerPatch);
  const reminder = scheduleReminderFromText(plantId, content, userMessageId);
  if (reminder) addReminderConfirmation(plantId, reminder);
  yield {
    type: "done",
    turn,
    usedLlm: true,
    usedMemoryIds: memoryCitations.map((item) => item.id),
    memoryCitations
  };
}

const prepareChatTurn = async (plantId: string, content: string) => {
  const turn = nextTurn(plantId);
  const userMessage = addMessage(plantId, turn, "user", content);
  rememberUserMessage(plantId, turn, content);
  createIntentionFromUserMessage(plantId, turn, content);
  const context = await buildChatContext(plantId, content, turn);
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
  innerPatch: InnerPatch
): void => {
  const assistant = addMessage(plantId, turn, "assistant", reply);
  const innerResult = applyInnerPatch(plantId, turn, innerPatch);
  if (innerResult.changed) {
    createIntentionFromInner(plantId, turn, innerResult.appliedPatch);
  }
  publishSyncEvent({
    type: "messages.changed",
    plantId,
    payload: { turn, messageId: assistant.id }
  });
  const plant = getPlant(plantId);
  if (plant) {
    scheduleDetectAndConsolidate(plantId, plant.name, turn);
    scheduleSessionClosure(plantId, plant.name, turn);
  }
};
