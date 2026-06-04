import { env } from "./env.js";

export const deviceConfigDeliveryConfig = {
  retryIntervalMs: env.DEVICE_CONFIG_RETRY_INTERVAL_MS
};
