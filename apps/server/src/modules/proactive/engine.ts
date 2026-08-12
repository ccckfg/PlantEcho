import { proactiveConfig } from "../../config/proactive.js";
import { listPlants } from "../plants/plantRepository.js";
import { considerOneIntention } from "./intentionProactiveService.js";
import { deliverDueReminder } from "./reminderDelivery.js";
import { listDueReminders } from "./reminderRepository.js";
import { generateTemporalIntentions } from "./temporalTriggers.js";

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export interface ProactiveEngine {
  start: () => void;
  stop: () => Promise<void>;
  scanNow: () => Promise<void>;
}

const errorText = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, 500);

export const createProactiveEngine = (logger: Logger): ProactiveEngine => {
  let timer: NodeJS.Timeout | null = null;
  let stopped = true;
  let running = false;

  const schedule = (delay = proactiveConfig.scanIntervalMs): void => {
    if (stopped) return;
    timer = setTimeout(() => void scanNow(), delay);
  };

  const scanIntentions = async (): Promise<void> => {
    for (const plant of await listPlants()) {
      try {
        await generateTemporalIntentions(plant.id);
      } catch (error) {
        logger.warn(`[proactive] temporal triggers for ${plant.id} failed: ${errorText(error)}`);
      }
      try {
        await considerOneIntention(plant.id);
      } catch (error) {
        logger.warn(`[proactive] intention scan for ${plant.id} failed: ${errorText(error)}`);
      }
    }
  };

  const scanReminders = async (): Promise<void> => {
    for (const reminder of await listDueReminders(new Date().toISOString())) {
      try {
        await deliverDueReminder(reminder.id);
      } catch (error) {
        logger.warn(`[proactive] reminder ${reminder.id} failed: ${errorText(error)}`);
      }
    }
  };

  const scanNow = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      if (proactiveConfig.enabled) await scanIntentions();
      await scanReminders();
    } catch (error) {
      logger.warn(`[proactive] scan failed: ${errorText(error)}`);
    } finally {
      running = false;
      schedule();
    }
  };

  return {
    start: () => {
      if (!stopped) return;
      stopped = false;
      logger.info(`[proactive] engine starts scanning in ${proactiveConfig.startupDelayMs}ms`);
      schedule(proactiveConfig.startupDelayMs);
    },
    stop: async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      while (running) await new Promise((resolve) => setTimeout(resolve, 25));
      logger.info("[proactive] engine stopped");
    },
    scanNow
  };
};
