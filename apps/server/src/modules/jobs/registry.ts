import { runConsolidationJob } from "../memory/consolidation/consolidationJob.js";
import { runReminderJob } from "../proactive/reminderJob.js";
import { jobTypes, type JobHandlerMap } from "./jobTypes.js";

export const createJobHandlers = (): JobHandlerMap => ({
  [jobTypes.memoryConsolidation]: runConsolidationJob,
  [jobTypes.proactiveReminder]: runReminderJob
});
