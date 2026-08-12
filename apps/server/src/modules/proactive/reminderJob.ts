import { jobTypes, type BackgroundJob } from "../jobs/jobTypes.js";
import { enqueueJob } from "../jobs/jobRepository.js";
import { deliverDueReminder } from "./reminderDelivery.js";
import { isProactiveStartupReady } from "./startupGuard.js";

const reminderDedupeKey = (id: string): string => `proactive.reminder:${id}`;

export const scheduleReminderJob = async (reminderId: string, remindAt: string): Promise<void> => {
  await enqueueJob({
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
  // The delayed engine scan remains the fallback for jobs completed during startup grace.
  if (!isProactiveStartupReady()) return;
  await deliverDueReminder(reminderId);
};
