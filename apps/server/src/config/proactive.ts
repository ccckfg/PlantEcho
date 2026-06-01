import { env } from "./env.js";

export const proactiveConfig = {
  enabled: env.PROACTIVE_ENABLED,
  llmEnabled: env.PROACTIVE_LLM_ENABLED,
  scanIntervalMs: env.PROACTIVE_SCAN_INTERVAL_MS,
  sensorCooldownMs: env.PROACTIVE_SENSOR_COOLDOWN_MS,
  offlineSensorCooldownMs: env.PROACTIVE_OFFLINE_SENSOR_COOLDOWN_MS,
  weatherCooldownMs: env.PROACTIVE_WEATHER_COOLDOWN_MS,
  reminderMaxDays: env.PROACTIVE_REMINDER_MAX_DAYS
};
