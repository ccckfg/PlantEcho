import { sensorConfig } from "../../config/sensors.js";
import type { SensorReading } from "./types.js";

const toTime = (now: Date | number): number => (now instanceof Date ? now.getTime() : now);

export const readingAgeMs = (
  reading: Pick<SensorReading, "capturedAt">,
  now: Date | number = Date.now()
): number | null => {
  const capturedAt = Date.parse(reading.capturedAt);
  if (Number.isNaN(capturedAt)) return null;
  return Math.max(0, toTime(now) - capturedAt);
};

export const isReadingOffline = (
  reading: Pick<SensorReading, "capturedAt">,
  now: Date | number = Date.now()
): boolean => {
  const ageMs = readingAgeMs(reading, now);
  return ageMs === null || ageMs > sensorConfig.offlineAfterMs;
};

export const formatReadingAge = (ageMs: number | null): string => {
  if (ageMs === null) return "一段时间";
  const minutes = Math.max(0, Math.round(ageMs / 60_000));
  if (minutes < 1) return "不到 1 分钟";
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  return `${Math.round(hours / 24)} 天`;
};
