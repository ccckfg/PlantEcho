import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { createReminder } from "./reminderRepository.js";
import { scheduleReminderJob } from "./reminderJob.js";
import type { ProactiveReminder } from "./types.js";

export const scheduleReminder = async (
  plantId: string,
  text: string,
  remindAt: Date,
  sourceMessageId: number | null
): Promise<ProactiveReminder> => {
  const reminder = await createReminder(plantId, text, remindAt, sourceMessageId);
  await scheduleReminderJob(reminder.id, reminder.remindAt);
  return reminder;
};

export const addReminderConfirmation = async (
  plantId: string,
  reminder: ProactiveReminder,
  options: { visibleTo?: string[]; publishMessagesChanged?: boolean } = {}
): Promise<void> => {
  const due = new Date(reminder.remindAt);
  const text = `我记下了，会在 ${due.toLocaleString("zh-CN", { hour12: false })} 提醒你：${reminder.text}`;
  const turn = await nextTurn(plantId);
  const message = await addMessage(plantId, turn, "assistant", text, options.visibleTo ?? [plantId]);
  if (options.publishMessagesChanged !== false) {
    await publishSyncEvent({
      type: "messages.changed",
      plantId,
      payload: { turn, messageId: message.id, proactive: true, reminderId: reminder.id }
    });
  }
};
