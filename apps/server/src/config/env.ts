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
  dotenv.config({ path: envPath });
}

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);
const envBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return value;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  DYN_DATA_DIR: z.string().default("data"),
  DB_PROVIDER: z.enum(["sqlite", "postgres"]).default("postgres"),
  DATABASE_URL: z.string().optional().default(""),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  RETENTION_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(86_400_000),
  RETENTION_SENSOR_RAW_DAYS: z.coerce.number().int().positive().default(30),
  RETENTION_SYNC_EVENTS_DAYS: z.coerce.number().int().positive().default(14),
  RETENTION_SUCCEEDED_JOBS_DAYS: z.coerce.number().int().positive().default(14),
  RETENTION_CONSUMED_DRAFTS_DAYS: z.coerce.number().int().positive().default(30),
  RETENTION_LLM_USAGE_DAYS: z.coerce.number().int().positive().default(180),
  RETENTION_PROACTIVE_EVENTS_DAYS: z.coerce.number().int().positive().default(90),
  RETENTION_PROACTIVE_DECISIONS_DAYS: z.coerce.number().int().positive().default(180),
  RETENTION_FINISHED_REMINDERS_DAYS: z.coerce.number().int().positive().default(180),
  RETENTION_AUTH_SESSIONS_DAYS: z.coerce.number().int().positive().default(180),
  RETENTION_PENDING_DEVICES_DAYS: z.coerce.number().int().positive().default(30),
  MQTT_ENABLED: envBoolean(true),
  MQTT_HOST: z.string().default("0.0.0.0"),
  MQTT_PORT: z.coerce.number().int().positive().default(1883),
  DEVICE_CONFIG_RETRY_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  DEFAULT_PLANT_ID: z.string().default("plant-demo"),
  DEFAULT_DEVICE_ID: z.string().default("esp32-demo"),
  APP_ACCESS_KEY: z.string().optional().default(""),
  AUTH_TOKEN_SECRET: z.string().optional().default(""),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(168),
  AUTH_REGISTRATION_ENABLED: envBoolean(true),
  LLM_API_URL: z.string().optional().default(""),
  LLM_API_KEY: z.string().optional().default(""),
  LLM_MODEL_ID: z.string().optional().default(""),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  LLM_INPUT_COST_PER_MILLION: z.coerce.number().nonnegative().default(0),
  LLM_OUTPUT_COST_PER_MILLION: z.coerce.number().nonnegative().default(0),
  SECONDARY_LLM_API_URL: z.string().optional().default(""),
  SECONDARY_LLM_API_KEY: z.string().optional().default(""),
  SECONDARY_LLM_MODEL_ID: z.string().optional().default(""),
  SECONDARY_LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  SECONDARY_LLM_INPUT_COST_PER_MILLION: z.coerce.number().nonnegative().default(0),
  SECONDARY_LLM_OUTPUT_COST_PER_MILLION: z.coerce.number().nonnegative().default(0),
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
  PROACTIVE_ENABLED: envBoolean(true),
  PROACTIVE_LLM_ENABLED: envBoolean(true),
  PROACTIVE_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  PROACTIVE_REMINDER_MAX_DAYS: z.coerce.number().int().positive().default(30),
  PROACTIVE_STARTUP_DELAY_MS: z.coerce.number().int().nonnegative().default(90_000),
  PROACTIVE_DEFAULT_TIMEZONE: z.string().trim().min(1).default("Asia/Shanghai"),
  PROACTIVE_QUIET_START: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("22:30"),
  PROACTIVE_QUIET_END: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("08:00"),
  PROACTIVE_USER_PRESENCE_WINDOW_MS: z.coerce.number().int().positive().default(30 * 60_000),
  PROACTIVE_VISIBLE_HEARTBEAT_TTL_MS: z.coerce.number().int().positive().default(90_000),
  PROACTIVE_INTENTION_CLAIM_MS: z.coerce.number().int().positive().default(10 * 60_000),
  PROACTIVE_KEEP_BASE_COOLDOWN_MS: z.coerce.number().int().positive().default(24 * 60 * 60_000),
  PROACTIVE_KEEP_MAX_COOLDOWN_MS: z.coerce.number().int().positive().default(4 * 24 * 60 * 60_000),
  PROACTIVE_INTENTION_FAILURE_RETRY_BASE_MS: z.coerce.number().int().positive().default(30 * 60_000),
  PROACTIVE_INTENTION_FAILURE_RETRY_MAX_MS: z.coerce.number().int().positive().default(12 * 60 * 60_000),
  PROACTIVE_REMINDER_CLAIM_LEASE_MS: z.coerce.number().int().positive().default(10 * 60_000),
  PROACTIVE_REMINDER_LATE_NARRATIVE_MS: z.coerce.number().int().positive().default(2 * 60 * 60_000),
  PROACTIVE_REMINDER_EXPIRE_AFTER_MS: z.coerce.number().int().positive().default(24 * 60 * 60_000),
  PROACTIVE_AWAY_RETRY_MS: z.coerce.number().int().positive().default(15 * 60_000),
  PROACTIVE_BUDGET_RETRY_MS: z.coerce.number().int().positive().default(60 * 60_000),
  PROACTIVE_BUDGET_REFILL_WINDOW_MS: z.coerce.number().int().positive().default(24 * 60 * 60_000),
  PROACTIVE_DEFAULT_TALKATIVENESS: z.enum(["quiet", "moderate", "active"]).default("moderate"),
  PROACTIVE_BUDGET_QUIET_CAPACITY: z.coerce.number().int().positive().default(1),
  PROACTIVE_BUDGET_MODERATE_CAPACITY: z.coerce.number().int().positive().default(2),
  PROACTIVE_BUDGET_ACTIVE_CAPACITY: z.coerce.number().int().positive().default(4),
  PROACTIVE_BODY_EWMA_ALPHA: z.coerce.number().positive().max(1).default(0.25),
  PROACTIVE_BODY_PERSISTENCE_MS: z.coerce.number().int().positive().default(12 * 60 * 60_000),
  PROACTIVE_BODY_MAX_GAP_MS: z.coerce.number().int().positive().default(30 * 60_000),
  PROACTIVE_BODY_INTENTION_EXPIRY_MS: z.coerce.number().int().positive().default(2 * 24 * 60 * 60_000),
  PROACTIVE_SILENCE_WARM_DAYS: z.coerce.number().int().positive().default(3),
  PROACTIVE_SILENCE_COOL_DAYS: z.coerce.number().int().positive().default(7),
  PROACTIVE_SILENCE_INTENTION_EXPIRY_MS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60_000),
  PROACTIVE_ANNIVERSARY_INTENTION_EXPIRY_MS: z.coerce.number().int().positive().default(2 * 24 * 60 * 60_000),
  PROACTIVE_MORNING_GREETING_ENABLED: envBoolean(false),
  PROACTIVE_MORNING_START: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("07:30"),
  PROACTIVE_MORNING_END: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("09:30")
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
