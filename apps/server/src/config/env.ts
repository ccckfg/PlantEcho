import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
import { defaultRerankModelId, rerankUrlFromBase } from "./rerank.js";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(configDir, "../../../../.env"),
  path.resolve(configDir, "../../../../../.env"),
  path.resolve(process.cwd(), ".env")
];

for (const envPath of [...new Set(envCandidates)]) {
  dotenv.config({ path: envPath, override: false });
}

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("127.0.0.1"),
  DYN_DATA_DIR: z.string().default("data"),
  MQTT_ENABLED: z.coerce.boolean().default(true),
  MQTT_HOST: z.string().default("0.0.0.0"),
  MQTT_PORT: z.coerce.number().int().positive().default(1883),
  DEFAULT_PLANT_ID: z.string().default("plant-demo"),
  DEFAULT_DEVICE_ID: z.string().default("esp32-demo"),
  APP_ACCESS_KEY: z.string().optional().default(""),
  AUTH_TOKEN_SECRET: z.string().optional().default(""),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(168),
  AUTH_REGISTRATION_ENABLED: z.coerce.boolean().default(true),
  LLM_API_URL: z.string().optional().default(""),
  LLM_API_KEY: z.string().optional().default(""),
  LLM_MODEL_ID: z.string().optional().default(""),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  EMBEDDING_PROVIDER: z.string().optional().default("openai-compatible"),
  EMBEDDING_API_URL: z.string().optional().default(""),
  EMBEDDING_API_KEY: z.string().optional().default(""),
  EMBEDDING_MODEL_ID: z.string().optional().default(""),
  EMBEDDING_DIMENSIONS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional()
  ),
  RERANK_API_URL: z.preprocess(emptyToUndefined, z.string().optional().default("")),
  RERANK_API_KEY: z.preprocess(emptyToUndefined, z.string().optional().default("")),
  RERANK_MODEL_ID: z.preprocess(emptyToUndefined, z.string().default(defaultRerankModelId)),
  WeatherKey: z.string().optional().default(""),
  WeatherUrl: z.string().optional().default(""),
  WeatherLocation: z.string().optional().default(""),
  QWEATHER_API_KEY: z.string().optional().default(""),
  QWEATHER_API_HOST: z.string().optional().default(""),
  QWEATHER_DEFAULT_LOCATION: z.string().optional().default("101200113"),
  QWEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  PROACTIVE_ENABLED: z.coerce.boolean().default(true),
  PROACTIVE_LLM_ENABLED: z.coerce.boolean().default(true),
  PROACTIVE_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  PROACTIVE_SENSOR_COOLDOWN_MS: z.coerce.number().int().nonnegative().default(30 * 60_000),
  PROACTIVE_OFFLINE_SENSOR_COOLDOWN_MS: z.coerce.number().int().nonnegative().default(12 * 60 * 60_000),
  PROACTIVE_WEATHER_COOLDOWN_MS: z.coerce.number().int().nonnegative().default(6 * 60 * 60_000),
  PROACTIVE_REMINDER_MAX_DAYS: z.coerce.number().int().positive().default(30)
});

const parsed = envSchema.parse(process.env);

const normalizeWeatherHost = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const env = {
  ...parsed,
  AUTH_TOKEN_SECRET: parsed.AUTH_TOKEN_SECRET || parsed.APP_ACCESS_KEY || "dyn-local-dev-secret",
  RERANK_API_URL: rerankUrlFromBase(parsed.RERANK_API_URL || parsed.LLM_API_URL),
  RERANK_API_KEY: parsed.RERANK_API_KEY || parsed.LLM_API_KEY,
  weatherApiKey: parsed.QWEATHER_API_KEY || parsed.WeatherKey,
  weatherApiHost: normalizeWeatherHost(parsed.QWEATHER_API_HOST || parsed.WeatherUrl),
  weatherDefaultLocation: parsed.WeatherLocation || parsed.QWEATHER_DEFAULT_LOCATION,
  dataDir: path.resolve(process.cwd(), parsed.DYN_DATA_DIR),
  databasePath: path.resolve(process.cwd(), parsed.DYN_DATA_DIR, "dyn.sqlite")
};
