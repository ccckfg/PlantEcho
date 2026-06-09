import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { detectReminderPlan } from "./reminderDetector.js";
import { createReminder } from "./reminderRepository.js";
import { scheduleReminderJob } from "./reminderJob.js";
import type { ProactiveReminder } from "./types.js";

export const scheduleReminderFromText = (
  plantId: string,
  text: string,
  sourceMessageId: number | null
): ProactiveReminder | null => {
  const plan = detectReminderPlan(text);
  if (!plan) return null;
  const reminder = createReminder(plantId, plan.text, plan.remindAt, sourceMessageId);
  scheduleReminderJob(reminder.id, reminder.remindAt);
  return reminder;
};

export const addReminderConfirmation = (
  plantId: string,
  reminder: ProactiveReminder,
  options: { visibleTo?: string[]; publishMessagesChanged?: boolean } = {}
): void => {
  const due = new Date(reminder.remindAt);
  const text = `我记下了，会在 ${due.toLocaleString("zh-CN", { hour12: false })} 提醒你：${reminder.text}`;
  const turn = nextTurn(plantId);
  const message = addMessage(plantId, turn, "assistant", text, options.visibleTo ?? [plantId]);
  if (options.publishMessagesChanged !== false) {
    publishSyncEvent({
      type: "messages.changed",
      plantId,
      payload: { turn, messageId: message.id, proactive: true, reminderId: reminder.id }
    });
  }
};
