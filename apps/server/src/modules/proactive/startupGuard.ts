import { proactiveConfig } from "../../config/proactive.js";

const readyAt = Date.now() + proactiveConfig.startupDelayMs;

export const isProactiveStartupReady = (now = Date.now()): boolean => now >= readyAt;
