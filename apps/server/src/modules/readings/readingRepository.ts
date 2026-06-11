import type { NormalizedDeviceReadingPayload } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import type { DatabaseClient } from "../../db/types.js";
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
): Promise<SensorReading> => {
  const db = getDb();
  const now = nowIso();
  return db.transaction(async (tx) => {
    const result = await tx.prepare(
      `INSERT INTO sensor_readings
       (device_id, plant_id, captured_at, soil_raw, soil_percent, air_temp_c,
        air_humidity_percent, light_lux, rssi, battery_mv, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
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
    await tx.prepare("UPDATE devices SET last_seen_at = ? WHERE id = ?").run(now, deviceId);
    return (await getReadingWithDb(tx, Number(result.lastInsertRowid)))!;
  });
};

export const getReading = async (id: number): Promise<SensorReading | null> => {
  return getReadingWithDb(getDb(), id);
};

const getReadingWithDb = async (
  db: DatabaseClient,
  id: number
): Promise<SensorReading | null> => {
  const row = await db.prepare("SELECT * FROM sensor_readings WHERE id = ?").get<ReadingRow>(id);
  return row ? toReading(row) : null;
};

export const getLatestReading = async (plantId: string): Promise<SensorReading | null> => {
  const row = await getDb()
    .prepare("SELECT * FROM sensor_readings WHERE plant_id = ? ORDER BY captured_at DESC, id DESC LIMIT 1")
    .get<ReadingRow>(plantId);
  return row ? toReading(row) : null;
};

export const listReadings = async (plantId: string, limit = 120): Promise<SensorReading[]> => {
  const rows = await getDb()
    .prepare("SELECT * FROM sensor_readings WHERE plant_id = ? ORDER BY captured_at DESC, id DESC LIMIT ?")
    .all<ReadingRow>(plantId, limit);
  return rows.map(toReading).reverse();
};
