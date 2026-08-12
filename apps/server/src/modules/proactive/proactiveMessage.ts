import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import {
  attachProactiveEventMessage,
  hasRecentProactiveEvent,
  logProactiveEvent
} from "./eventLogRepository.js";
import { composeProactiveMessage } from "./proactiveMessageComposer.js";
import { rememberProactiveMessage } from "./proactiveMemory.js";
import type { ProactiveEventInput } from "./types.js";

export const emitProactiveMessage = async (
  event: ProactiveEventInput
): Promise<number | null> => {
  if (await hasRecentProactiveEvent(event.plantId, event.key, event.cooldownMs)) {
    return null;
  }
  const eventLogId = await logProactiveEvent(event, null);
  const content = await composeProactiveMessage(event);
  if (!content) return null;
  const turn = await nextTurn(event.plantId);
  const message = await addMessage(event.plantId, turn, "assistant", content);
  if (event.type !== "reminder.due") {
    await rememberProactiveMessage(event.plantId, turn, content, `proactive:${event.type}`);
  }
  await attachProactiveEventMessage(eventLogId, message.id);
  await publishSyncEvent({
    type: "messages.changed",
    plantId: event.plantId,
    payload: { turn, messageId: message.id, proactive: true, eventType: event.type }
  });
  return message.id;
};
