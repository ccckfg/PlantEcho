import { SENSOR_OFFLINE_AFTER_MS } from "@/config/sensors";
import type { ReadingRow } from "./api";

export type SensorConnectionState = "online" | "offline" | "waiting";

export interface SensorConnection {
  state: SensorConnectionState;
  label: string;
  detail: string;
  icon: string;
  ageMs: number | null;
}

const toTime = (now: Date | number): number => (now instanceof Date ? now.getTime() : now);

export function formatSensorAge(ageMs: number): string {
  const minutes = Math.max(0, Math.round(ageMs / 60_000));
  if (minutes < 1) return "不到 1 分钟";
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  return `${Math.round(hours / 24)} 天`;
}

export function getSensorConnection(
  reading: ReadingRow | null | undefined,
  now: Date | number = Date.now()
): SensorConnection {
  if (!reading) {
    return {
      state: "waiting",
      label: "等待数据",
      detail: "还没有收到传感器读数",
      icon: "sensors_off",
      ageMs: null
    };
  }

  const capturedAt = Date.parse(reading.capturedAt);
  if (Number.isNaN(capturedAt)) {
    return {
      state: "offline",
      label: "传感器离线",
      detail: "最后读数时间异常，无法判断实时状态",
      icon: "sensors_off",
      ageMs: null
    };
  }

  const ageMs = Math.max(0, toTime(now) - capturedAt);
  if (ageMs > SENSOR_OFFLINE_AFTER_MS) {
    return {
      state: "offline",
      label: "传感器离线",
      detail: `已超过 ${formatSensorAge(ageMs)} 未收到上报`,
      icon: "sensors_off",
      ageMs
    };
  }

  return {
    state: "online",
    label: "在线",
    detail: `最近 ${formatSensorAge(ageMs)}前收到上报`,
    icon: "sensors",
    ageMs
  };
}
