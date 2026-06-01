import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { scheduleDetectAndConsolidate } from "../memory/consolidation/consolidationJob.js";
import { getPlant } from "../plants/plantRepository.js";
import { updatePlantStatus } from "../plants/statusRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import {
  attachProactiveEventMessage,
  hasRecentProactiveEvent,
  logProactiveEvent
} from "./eventLogRepository.js";
import { composeProactiveMessage } from "./proactiveMessageComposer.js";
import type { ProactiveEventInput } from "./types.js";

export const emitProactiveMessage = async (
  event: ProactiveEventInput
): Promise<number | null> => {
  if (hasRecentProactiveEvent(event.plantId, event.key, event.cooldownMs)) {
    return null;
  }
  const eventLogId = logProactiveEvent(event, null);
  const content = await composeProactiveMessage(event);
  const turn = nextTurn(event.plantId);
  const message = addMessage(event.plantId, turn, "assistant", content);
  attachProactiveEventMessage(eventLogId, message.id);
  updatePlantStatus(event.plantId, {
    mood: event.severity === "critical" ? "有点着急" : "主动留意",
    focus: content.slice(0, 80),
    lastSummary: content
  });
  publishSyncEvent({
    type: "messages.changed",
    plantId: event.plantId,
    payload: { turn, messageId: message.id, proactive: true, eventType: event.type }
  });
  const plant = getPlant(event.plantId);
  if (plant) scheduleDetectAndConsolidate(event.plantId, plant.name, turn);
  return message.id;
};
