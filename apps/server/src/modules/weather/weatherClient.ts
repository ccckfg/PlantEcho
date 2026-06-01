import { env } from "../../config/env.js";
import type { WeatherLocation, WeatherNow } from "./weatherTypes.js";

type QWeatherNowResponse = {
  code: string;
  updateTime?: string;
  now?: {
    obsTime?: string;
    temp?: string;
    feelsLike?: string;
    icon?: string;
    text?: string;
    windDir?: string;
    windScale?: string;
    windSpeed?: string;
    humidity?: string;
    precip?: string;
    pressure?: string;
    vis?: string;
  };
};

type QWeatherLookupResponse = {
  code: string;
  location?: Array<{
    id: string;
    name: string;
    adm1?: string;
    adm2?: string;
    country?: string;
    lat?: string;
    lon?: string;
  }>;
};

const numberOrNull = (value: string | undefined): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const weatherUrl = (path: string, params: Record<string, string>): string => {
  if (!env.weatherApiHost) throw new Error("QWeather host is not configured");
  const url = new URL(path, `${env.weatherApiHost}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
};

const requestQWeather = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  if (!env.weatherApiKey) throw new Error("QWeather API key is not configured");
  const response = await fetch(weatherUrl(path, params), {
    headers: {
      "X-QW-Api-Key": env.weatherApiKey,
      accept: "application/json"
    }
  });
  if (!response.ok) throw new Error(`QWeather request failed: HTTP ${response.status}`);
  const json = await response.json() as { code?: string };
  if (json.code !== "200") throw new Error(`QWeather request failed: code ${json.code ?? "UNKNOWN"}`);
  return json as T;
};

export const isWeatherConfigured = (): boolean => Boolean(env.weatherApiHost && env.weatherApiKey);

export const fetchWeatherNow = async (
  location: string,
  lang = "zh",
  unit = "m"
): Promise<WeatherNow> => {
  const json = await requestQWeather<QWeatherNowResponse>("/v7/weather/now", { location, lang, unit });
  const now = json.now ?? {};
  return {
    location,
    observedAt: now.obsTime ?? json.updateTime ?? new Date().toISOString(),
    temperatureC: numberOrNull(now.temp),
    feelsLikeC: numberOrNull(now.feelsLike),
    humidityPercent: numberOrNull(now.humidity),
    text: now.text ?? "未知天气",
    icon: now.icon ?? "",
    windDir: now.windDir ?? "",
    windScale: now.windScale ?? "",
    windSpeedKph: numberOrNull(now.windSpeed),
    precipMm: numberOrNull(now.precip),
    pressureHpa: numberOrNull(now.pressure),
    visibilityKm: numberOrNull(now.vis),
    sourceUpdatedAt: json.updateTime ?? new Date().toISOString()
  };
};

export const lookupWeatherLocations = async (
  location: string,
  lang = "zh"
): Promise<WeatherLocation[]> => {
  const json = await requestQWeather<QWeatherLookupResponse>("/geo/v2/city/lookup", {
    location,
    lang,
    range: "cn"
  });
  return (json.location ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    adm1: item.adm1 ?? "",
    adm2: item.adm2 ?? "",
    country: item.country ?? "",
    lat: item.lat ?? "",
    lon: item.lon ?? ""
  }));
};
