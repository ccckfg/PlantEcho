import { proactiveConfig } from "../../config/proactive.js";
import { listPlants } from "../plants/plantRepository.js";
import { getWeatherNow } from "../weather/weatherService.js";
import { buildSensorEvent } from "./sensorTriggers.js";
import { buildRainEvent } from "./weatherTriggers.js";
import { emitProactiveMessage } from "./proactiveMessage.js";
import { listDueReminders, markReminderStatus } from "./reminderRepository.js";

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export interface ProactiveEngine {
  start: () => void;
  stop: () => Promise<void>;
  scanNow: () => Promise<void>;
  scanSensor: (plantId: string) => Promise<void>;
}

const sanitizeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

export const createProactiveEngine = (logger: Logger): ProactiveEngine => {
  let timer: NodeJS.Timeout | null = null;
  let stopped = true;
  let running = false;

  const scanSensor = async (plantId: string): Promise<void> => {
    if (!proactiveConfig.enabled) return;
    const event = buildSensorEvent(plantId);
    if (event) await emitProactiveMessage(event);
  };

  const scanWeather = async (): Promise<void> => {
    const weather = await getWeatherNow();
    if (!weather.configured || !weather.weather) return;
    for (const plant of listPlants()) {
      const event = buildRainEvent(plant.id, weather.weather);
      if (event) await emitProactiveMessage(event);
    }
  };

  const scanReminders = async (): Promise<void> => {
    for (const reminder of listDueReminders(new Date().toISOString())) {
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
    }
  };

  const schedule = (): void => {
    if (stopped) return;
    timer = setTimeout(() => void scanNow(), proactiveConfig.scanIntervalMs);
  };

  const scanNow = async (): Promise<void> => {
    if (stopped || running || !proactiveConfig.enabled) return;
    running = true;
    try {
      for (const plant of listPlants()) await scanSensor(plant.id);
      await scanReminders();
      await scanWeather();
    } catch (error) {
      logger.warn(`[proactive] scan failed: ${sanitizeError(error)}`);
    } finally {
      running = false;
      schedule();
    }
  };

  return {
    start: () => {
      if (!stopped) return;
      stopped = false;
      logger.info("[proactive] engine started");
      void scanNow();
    },
    stop: async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      while (running) await new Promise((resolve) => setTimeout(resolve, 25));
      logger.info("[proactive] engine stopped");
    },
    scanNow,
    scanSensor
  };
};
