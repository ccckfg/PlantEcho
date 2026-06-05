import type { CareProfile } from "@dyn/shared";
import type { ReadingRow } from "./api";
import { getSensorConnection } from "./sensorStatus";

export type MoodKey = "happy" | "thirsty" | "sunny" | "neutral" | "offline";

export interface MoodMeta {
  label: string;
  icon: string;
  classes: string;
}

export const MOOD_PRESETS: Record<MoodKey, MoodMeta> = {
  happy: {
    label: "舒展",
    icon: "sentiment_satisfied",
    classes: "bg-secondary-container text-on-secondary-container"
  },
  thirsty: {
    label: "想喝水",
    icon: "local_fire_department",
    classes: "bg-error-container text-on-error-container border border-error/20"
  },
  sunny: {
    label: "晒太阳",
    icon: "light_mode",
    classes: "bg-tertiary-fixed text-on-tertiary-fixed-variant"
  },
  neutral: {
    label: "安静",
    icon: "spa",
    classes: "bg-surface-container-high text-on-surface-variant"
  },
  offline: {
    label: "在等",
    icon: "sensors_off",
    classes: "bg-surface-container text-on-surface-variant"
  }
};

export const MOOD_BUBBLES: Record<MoodKey, string> = {
  happy: "今天我感觉绿意盎然！",
  thirsty: "再来一点水，一滴也好。",
  sunny: "这光线刚刚好。",
  neutral: "我在这里慢慢呼吸。",
  offline: "我暂时听不到自己的传感器了。"
};

export interface DerivedStatus {
  mood: MoodKey;
  caption: string;
  hydration: number;
  light: number;
  humidity: number;
  highlightIcon: string;
  highlightTone: "primary" | "error" | "tertiary" | "muted";
}

const clamp01 = (value: number) => Math.max(0, Math.min(100, value));

export function deriveStatus(
  reading: ReadingRow | null | undefined,
  care?: CareProfile,
  now: Date | number = Date.now(),
  sensorTrusted = true
): DerivedStatus {
  const fallback: DerivedStatus = {
    mood: "neutral",
    caption: reading ? "我在等下一次读数" : "还没收到我的传感器",
    hydration: 0,
    light: 0,
    humidity: 0,
    highlightIcon: "spa",
    highlightTone: "muted"
  };
  if (!reading) return fallback;
  if (!sensorTrusted) {
    return {
      mood: "neutral",
      caption: "这些读数暂时不代表我",
      hydration: 0,
      light: 0,
      humidity: 0,
      highlightIcon: "sensors_off",
      highlightTone: "muted"
    };
  }

  const connection = getSensorConnection(reading, now);
  if (connection.state === "offline") {
    return {
      mood: "offline",
      caption: connection.detail,
      hydration: 0,
      light: 0,
      humidity: 0,
      highlightIcon: "sensors_off",
      highlightTone: "muted"
    };
  }

  const soil = reading.soilPercent ?? null;
  const lux = reading.lightLux ?? null;
  const humid = reading.airHumidityPercent ?? null;

  const hydration = soil != null ? clamp01(soil) : 0;
  const humidity = humid != null ? clamp01(humid) : 0;
  const light =
    lux != null
      ? clamp01(
          care
            ? ((lux - care.light.minLux) /
                Math.max(1, care.light.maxLux - care.light.minLux)) *
                100
            : Math.min(100, lux / 200)
        )
      : 0;

  let mood: MoodKey = "happy";
  let caption = "我现在很舒服";
  let highlightIcon = "water_drop";
  let highlightTone: DerivedStatus["highlightTone"] = "primary";

  if (care) {
    if (soil != null && soil < care.soil.min) {
      mood = "thirsty";
      caption = "我有点渴了，可以来点水吗？";
      highlightIcon = "water_drop";
      highlightTone = "error";
    } else if (lux != null && lux > care.light.maxLux) {
      mood = "sunny";
      caption = "光有点太烈了，能挪一挪吗？";
      highlightIcon = "wb_sunny";
      highlightTone = "tertiary";
    } else if (lux != null && lux >= care.light.minLux) {
      mood = "sunny";
      caption = "我很喜欢现在的阳光";
      highlightIcon = "wb_sunny";
      highlightTone = "tertiary";
    } else {
      mood = "happy";
      caption = "目前不需要照顾我，谢谢你来看我";
      highlightIcon = "water_drop";
      highlightTone = "primary";
    }
  }

  return { mood, caption, hydration, light, humidity, highlightIcon, highlightTone };
}

export function moodFromStatus(state: string | null | undefined): MoodKey {
  if (!state) return "neutral";
  const lower = state.toLowerCase();
  if (lower.includes("soil") || lower.includes("dry") || lower.includes("water")) return "thirsty";
  if (lower.includes("light") || lower.includes("sun")) return "sunny";
  if (lower.includes("ok") || lower.includes("good")) return "happy";
  return "neutral";
}
