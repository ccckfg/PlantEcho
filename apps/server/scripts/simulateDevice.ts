import { env } from "../src/config/env.js";
import type { DeviceReadingPayload } from "@dyn/shared";

const deviceId = process.env.DEVICE_ID ?? env.DEFAULT_DEVICE_ID;
const host = env.HOST === "0.0.0.0" ? "127.0.0.1" : env.HOST;
const baseUrl = process.env.SERVER_URL ?? `http://${host}:${env.PORT}`;
const intervalMs = Math.max(1000, Number(process.env.SIM_INTERVAL_MS ?? 5000));
const apiKey = process.env.DEVICE_API_KEY ?? "";
const runOnce = ["1", "true", "yes"].includes((process.env.SIM_ONCE ?? "").toLowerCase());

const scenarios = ["normal", "dry", "wet", "dark", "hot", "cycle"] as const;
type Scenario = (typeof scenarios)[number];

const requestedScenario = process.env.SIM_SCENARIO ?? "cycle";
const scenario: Scenario = scenarios.includes(requestedScenario as Scenario)
  ? (requestedScenario as Scenario)
  : "cycle";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const withNoise = (base: number, spread: number): number =>
  base + (Math.random() * 2 - 1) * spread;

const chooseScenario = (): Exclude<Scenario, "cycle"> => {
  if (scenario !== "cycle") return scenario;
  const minute = Math.floor(Date.now() / 60000);
  return scenarios[minute % (scenarios.length - 1)] as Exclude<Scenario, "cycle">;
};

const nextReading = (): DeviceReadingPayload => {
  const t = Date.now() / 1000;
  const activeScenario = chooseScenario();
  const base = {
    capturedAt: new Date().toISOString(),
    soilRaw: Math.round(withNoise(2200 + Math.sin(t / 25) * 220, 35)),
    soilPercent: Math.round(clamp(withNoise(48 + Math.sin(t / 30) * 12, 2), 0, 100)),
    airTempC: Number(withNoise(24 + Math.sin(t / 40) * 1.5, 0.3).toFixed(1)),
    airHumidityPercent: Math.round(clamp(withNoise(58 + Math.cos(t / 35) * 6, 2), 0, 100)),
    lightLux: Math.round(clamp(withNoise(1200 + Math.max(0, Math.sin(t / 18)) * 1800, 80), 0, 8000)),
    rssi: -52,
    batteryMv: null
  };

  if (activeScenario === "dry") return { ...base, soilRaw: 3200, soilPercent: 16 };
  if (activeScenario === "wet") return { ...base, soilRaw: 1250, soilPercent: 92 };
  if (activeScenario === "dark") return { ...base, lightLux: 80 };
  if (activeScenario === "hot") return { ...base, airTempC: 34.5 };
  return base;
};

const postReading = async () => {
  const payload = nextReading();
  const headers = new Headers({ "content-type": "application/json" });
  if (apiKey) headers.set("x-api-key", apiKey);

  const response = await fetch(`${baseUrl}/api/v1/devices/${deviceId}/readings`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  const stamp = new Date().toLocaleTimeString();
  console.log(`[${stamp}] ${response.status} ${JSON.stringify(payload)} -> ${text}`);
};

console.log(`Simulating ${deviceId} -> ${baseUrl}`);
console.log(`Scenario=${scenario} Interval=${intervalMs}ms Once=${runOnce}`);
await postReading();
if (!runOnce) {
  setInterval(() => {
    postReading().catch((error) => console.error(error));
  }, intervalMs);
}
