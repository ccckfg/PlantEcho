import { proactiveConfig } from "../../config/proactive.js";
import { env } from "../../config/env.js";
import type { WeatherNow } from "../weather/weatherTypes.js";
import type { ProactiveEventInput } from "./types.js";

const rainTextPattern = /(雨|阵雨|雷阵雨|小雨|中雨|大雨|暴雨|雨夹雪)/;

export const isRainyWeather = (weather: WeatherNow): boolean => {
  return rainTextPattern.test(weather.text) || (weather.precipMm ?? 0) > 0;
};

export const buildRainEvent = (
  plantId: string,
  weather: WeatherNow
): ProactiveEventInput | null => {
  if (!isRainyWeather(weather)) return null;
  const location = weather.location || env.weatherDefaultLocation;
  const precip = weather.precipMm !== null ? `，降水量 ${weather.precipMm}mm` : "";
  return {
    plantId,
    type: "weather.rain",
    key: `weather.rain:${location}`,
    severity: "info",
    content: `外面现在是${weather.text}${precip}。出门的话记得带伞，我在家里等你回来。`,
    facts: [
      `地点：${location}`,
      `天气：${weather.text}`,
      weather.precipMm !== null ? `降水量：${weather.precipMm}mm` : "降水量：未知",
      "提醒：出门带伞"
    ],
    payload: {
      location,
      text: weather.text,
      precipMm: weather.precipMm,
      observedAt: weather.observedAt
    },
    cooldownMs: proactiveConfig.weatherCooldownMs
  };
};
