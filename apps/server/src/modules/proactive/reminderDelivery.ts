import { proactiveConfig } from "../../config/proactive.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { composeProactiveMessage } from "./proactiveMessageComposer.js";
import {
  finalizeReminderDelivery,
  type FinalizedReminderDelivery
} from "./reminderFinalizer.js";
import {
  claimDueReminder,
  expireReminderClaim,
  releaseReminderClaim
} from "./reminderRepository.js";
import type { ProactiveEventInput } from "./types.js";

export type ReminderDeliveryResult = "sent" | "expired" | "skipped";

export const deliverDueReminder = async (
  reminderId: string,
  now = new Date()
): Promise<ReminderDeliveryResult> => {
  const reminder = await claimDueReminder(
    reminderId,
    proactiveConfig.reminderClaimLeaseMs,
    now
  );
  if (!reminder?.claimToken) return "skipped";
  const token = reminder.claimToken;
  const lateByMs = Math.max(0, now.getTime() - new Date(reminder.remindAt).getTime());
  if (lateByMs > proactiveConfig.reminderExpireAfterMs) {
    await expireReminderClaim(reminder.id, token);
    return "expired";
  }
  const isLate = lateByMs > proactiveConfig.reminderLateNarrativeMs;
  const content = isLate
    ? `抱歉，这句迟到了：你之前让我提醒你：${reminder.text}`
    : `你让我提醒你：${reminder.text}`;
  const event: ProactiveEventInput = {
    plantId: reminder.plantId,
    type: "reminder.due",
    key: `reminder:${reminder.id}`,
    severity: "info",
    content,
    facts: [`提醒内容：${reminder.text}`, `提醒时间：${reminder.remindAt}`],
    payload: {
      reminderId: reminder.id,
      reminderText: reminder.text,
      remindAt: reminder.remindAt,
      lateByMs
    },
    cooldownMs: 0
  };
  let finalized: FinalizedReminderDelivery | null;
  try {
    const composed = await composeProactiveMessage(event);
    if (!composed) throw new Error("Reminder composition produced no deliverable message");
    finalized = await finalizeReminderDelivery({
      reminderId: reminder.id,
      claimToken: token,
      event,
      content: composed
    });
  } catch (error) {
    await releaseReminderClaim(reminder.id, token);
    throw error;
  }
  if (!finalized) return "skipped";
  await publishSyncEvent({
    type: "messages.changed",
    plantId: reminder.plantId,
    payload: {
      turn: finalized.turn,
      messageId: finalized.messageId,
      proactive: true,
      eventType: event.type
    }
  });
  return "sent";
};
