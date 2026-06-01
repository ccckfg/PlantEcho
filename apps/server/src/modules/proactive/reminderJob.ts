import { jobTypes, type BackgroundJob } from "../jobs/jobTypes.js";
import { enqueueJob } from "../jobs/jobRepository.js";
import { emitProactiveMessage } from "./proactiveMessage.js";
import { getReminder, markReminderStatus } from "./reminderRepository.js";

const reminderDedupeKey = (id: string): string => `proactive.reminder:${id}`;

export const scheduleReminderJob = (reminderId: string, remindAt: string): void => {
  enqueueJob({
    type: jobTypes.proactiveReminder,
    payload: { reminderId },
    dedupeKey: reminderDedupeKey(reminderId),
    runAfter: remindAt,
    maxAttempts: 3
  });
};

export const runReminderJob = async (job: BackgroundJob): Promise<void> => {
  const reminderId = typeof job.payload.reminderId === "string" ? job.payload.reminderId : "";
  if (!reminderId) throw new Error("Invalid proactive reminder payload");
  const reminder = getReminder(reminderId);
  if (!reminder || reminder.status !== "scheduled") return;
  await emitProactiveMessage({
    plantId: reminder.plantId,
    type: "reminder.due",
    key: `reminder:${reminder.id}`,
    severity: "info",
    content: `你让我提醒你：${reminder.text}`,
    facts: [`提醒内容：${reminder.text}`, `提醒时间：${reminder.remindAt}`],
    payload: { reminderId: reminder.id, remindAt: reminder.remindAt },
    cooldownMs: 0
  });
  markReminderStatus(reminder.id, "sent");
};
