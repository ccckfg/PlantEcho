import { env } from "../../config/env.js";
import { getCached, setCached } from "./weatherCache.js";
import {
  fetchWeatherNow,
  isWeatherConfigured,
  lookupWeatherLocations
} from "./weatherClient.js";
import type { WeatherLocation, WeatherNow, WeatherNowResult } from "./weatherTypes.js";

export const getWeatherNow = async (
  location = env.weatherDefaultLocation,
  lang = "zh"
): Promise<WeatherNowResult> => {
  if (!isWeatherConfigured()) {
    return { configured: false, weather: null, cachedAt: null };
  }
  const key = `now:${location}:${lang}`;
  const cached = getCached<WeatherNow>(key);
  if (cached) return { configured: true, weather: cached.value, cachedAt: cached.cachedAt };

  const fresh = await fetchWeatherNow(location, lang);
  const saved = setCached(key, fresh, env.QWEATHER_CACHE_TTL_SECONDS);
  return { configured: true, weather: saved.value, cachedAt: saved.cachedAt };
};

export const searchWeatherLocations = async (
  query: string,
  lang = "zh"
): Promise<WeatherLocation[]> => {
  if (!isWeatherConfigured() || !query.trim()) return [];
  const key = `lookup:${query.trim()}:${lang}`;
  const cached = getCached<WeatherLocation[]>(key);
  if (cached) return cached.value;
  const fresh = await lookupWeatherLocations(query.trim(), lang);
  return setCached(key, fresh, env.QWEATHER_CACHE_TTL_SECONDS).value;
};
