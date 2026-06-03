import type { NormalizedDeviceReadingPayload } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import type { SensorReading } from "./types.js";

type ReadingRow = {
  id: number;
  device_id: string;
  plant_id: string;
  captured_at: string;
  soil_raw: number | null;
  soil_percent: number | null;
  air_temp_c: number | null;
  air_humidity_percent: number | null;
  light_lux: number | null;
  rssi: number | null;
  battery_mv: number | null;
  created_at: string;
};

const toReading = (row: ReadingRow): SensorReading => ({
  id: row.id,
  deviceId: row.device_id,
  plantId: row.plant_id,
  capturedAt: row.captured_at,
  soilRaw: row.soil_raw,
  soilPercent: row.soil_percent,
  airTempC: row.air_temp_c,
  airHumidityPercent: row.air_humidity_percent,
  lightLux: row.light_lux,
  rssi: row.rssi,
  batteryMv: row.battery_mv,
  createdAt: row.created_at
});

export const insertReading = (
  deviceId: string,
  plantId: string,
  payload: NormalizedDeviceReadingPayload
): SensorReading => {
  const db = getDb();
  const now = nowIso();
  const result = db
    .prepare(
      `INSERT INTO sensor_readings
       (device_id, plant_id, captured_at, soil_raw, soil_percent, air_temp_c,
        air_humidity_percent, light_lux, rssi, battery_mv, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      deviceId,
      plantId,
      payload.capturedAt,
      payload.soilRaw,
      payload.soilPercent,
      payload.airTempC,
      payload.airHumidityPercent,
      payload.lightLux,
      payload.rssi,
      payload.batteryMv,
      now
    );
  db.prepare("UPDATE devices SET last_seen_at = ? WHERE id = ?").run(now, deviceId);
  return getReading(Number(result.lastInsertRowid))!;
};

export const getReading = (id: number): SensorReading | null => {
  const row = getDb().prepare("SELECT * FROM sensor_readings WHERE id = ?").get(id) as
    | ReadingRow
    | undefined;
  return row ? toReading(row) : null;
};

export const getLatestReading = (plantId: string): SensorReading | null => {
  const row = getDb()
    .prepare("SELECT * FROM sensor_readings WHERE plant_id = ? ORDER BY captured_at DESC, id DESC LIMIT 1")
    .get(plantId) as ReadingRow | undefined;
  return row ? toReading(row) : null;
};

export const listReadings = (plantId: string, limit = 120): SensorReading[] => {
  const rows = getDb()
    .prepare("SELECT * FROM sensor_readings WHERE plant_id = ? ORDER BY captured_at DESC, id DESC LIMIT ?")
    .all(plantId, limit) as ReadingRow[];
  return rows.map(toReading).reverse();
};
