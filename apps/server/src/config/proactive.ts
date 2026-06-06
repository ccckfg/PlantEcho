import { env } from "./env.js";

export const proactiveConfig = {
  enabled: env.PROACTIVE_ENABLED,
  llmEnabled: env.PROACTIVE_LLM_ENABLED,
  scanIntervalMs: env.PROACTIVE_SCAN_INTERVAL_MS,
  weatherEnabled: env.PROACTIVE_WEATHER_ENABLED,
  weatherScanIntervalMs: env.PROACTIVE_WEATHER_SCAN_INTERVAL_MS,
  weatherCooldownMs: env.PROACTIVE_WEATHER_COOLDOWN_MS,
  reminderMaxDays: env.PROACTIVE_REMINDER_MAX_DAYS,
  intentionConsiderationCooldownMs: 24 * 60 * 60_000,
  intentionMaxConsiderations: 3
};
