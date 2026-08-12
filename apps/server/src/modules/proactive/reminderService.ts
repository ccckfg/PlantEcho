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
