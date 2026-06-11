import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import type { DeviceConfigPayload } from "./deviceConfigTypes.js";

type DeviceConfigDeliveryRow = {
  device_id: string;
  payload_json: string;
  attempts: number;
  last_attempted_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface DeviceConfigDelivery {
  deviceId: string;
  payload: DeviceConfigPayload;
  attempts: number;
  lastAttemptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const parsePayload = (value: string): DeviceConfigPayload => {
  const parsed = JSON.parse(value) as DeviceConfigPayload;
  if (parsed.type !== "device.credentials" || !parsed.deviceId || !parsed.apiKey) {
    throw new Error("Invalid queued device config payload");
  }
  return parsed;
};

const toDelivery = (row: DeviceConfigDeliveryRow): DeviceConfigDelivery => ({
  deviceId: row.device_id,
  payload: parsePayload(row.payload_json),
  attempts: row.attempts,
  lastAttemptedAt: row.last_attempted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const upsertDeviceConfigDelivery = (
  deviceId: string,
  payload: DeviceConfigPayload
): Promise<DeviceConfigDelivery> => {
  return upsertDeviceConfigDeliveryAsync(deviceId, payload);
};

const upsertDeviceConfigDeliveryAsync = async (
  deviceId: string,
  payload: DeviceConfigPayload
): Promise<DeviceConfigDelivery> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO device_config_deliveries
       (device_id, payload_json, attempts, last_attempted_at, created_at, updated_at)
       VALUES (?, ?, 0, NULL, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         attempts = 0,
         last_attempted_at = NULL,
         updated_at = excluded.updated_at`
    )
    .run(deviceId, JSON.stringify(payload), now, now);
  return (await getDeviceConfigDelivery(deviceId))!;
};

export const getDeviceConfigDelivery = (
  deviceId: string
): Promise<DeviceConfigDelivery | null> => {
  return getDeviceConfigDeliveryAsync(deviceId);
};

const getDeviceConfigDeliveryAsync = async (
  deviceId: string
): Promise<DeviceConfigDelivery | null> => {
  const row = await getDb()
    .prepare("SELECT * FROM device_config_deliveries WHERE device_id = ?")
    .get<DeviceConfigDeliveryRow>(deviceId);
  return row ? toDelivery(row) : null;
};

export const hasDeviceConfigDelivery = async (deviceId: string): Promise<boolean> => {
  const row = await getDb()
    .prepare("SELECT 1 FROM device_config_deliveries WHERE device_id = ?")
    .get<Record<string, unknown>>(deviceId);
  return Boolean(row);
};

export const listDeviceConfigDeliveries = async (): Promise<DeviceConfigDelivery[]> => {
  const rows = await getDb()
    .prepare("SELECT * FROM device_config_deliveries ORDER BY updated_at ASC")
    .all<DeviceConfigDeliveryRow>();
  return rows.map(toDelivery);
};

export const markDeviceConfigDeliveryAttempt = async (deviceId: string): Promise<void> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `UPDATE device_config_deliveries SET
         attempts = attempts + 1,
         last_attempted_at = ?,
         updated_at = ?
       WHERE device_id = ?`
    )
    .run(now, now, deviceId);
};

export const clearDeviceConfigDelivery = async (deviceId: string): Promise<void> => {
  await getDb()
    .prepare("DELETE FROM device_config_deliveries WHERE device_id = ?")
    .run(deviceId);
};
