export interface WeatherNow {
  location: string;
  observedAt: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPercent: number | null;
  text: string;
  icon: string;
  windDir: string;
  windScale: string;
  windSpeedKph: number | null;
  precipMm: number | null;
  pressureHpa: number | null;
  visibilityKm: number | null;
  sourceUpdatedAt: string;
}

export interface WeatherLocation {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
  country: string;
  lat: string;
  lon: string;
}

export interface WeatherNowResult {
  configured: boolean;
  weather: WeatherNow | null;
  cachedAt: string | null;
}
