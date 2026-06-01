export type { PlantHealthIssue, PlantHealthSummary } from "@dyn/shared";

export interface SensorReading {
  id: number;
  deviceId: string;
  plantId: string;
  capturedAt: string;
  soilRaw: number | null;
  soilPercent: number | null;
  airTempC: number | null;
  airHumidityPercent: number | null;
  lightLux: number | null;
  rssi: number | null;
  batteryMv: number | null;
  createdAt: string;
}
