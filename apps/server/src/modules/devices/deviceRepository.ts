import type { DeviceRecord, PendingDevice } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type DeviceRow = {
  id: string;
  plant_id: string;
  name: string;
  api_key_hash: string | null;
  last_seen_at: string | null;
  created_at: string;
};

type PendingDeviceRow = {
  id: string;
  first_seen_at: string;
  last_seen_at: string;
  latest_payload_json: string;
  rssi: number | null;
  claim_status: PendingDevice["claimStatus"];
};

const parseJsonObject = (text: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
};

const toDevice = (row: DeviceRow): DeviceRecord => ({
  id: row.id,
  plantId: row.plant_id,
  name: row.name,
  hasApiKey: Boolean(row.api_key_hash),
  lastSeenAt: row.last_seen_at,
  createdAt: row.created_at
});

const toPendingDevice = (row: PendingDeviceRow): PendingDevice => ({
  id: row.id,
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  latestPayload: parseJsonObject(row.latest_payload_json),
  rssi: row.rssi,
  claimStatus: row.claim_status
});

export const getDevice = (deviceId: string): DeviceRecord | null => {
  const row = getDb().prepare("SELECT * FROM devices WHERE id = ?").get(deviceId) as
    | DeviceRow
    | undefined;
  return row ? toDevice(row) : null;
};

export const listDevices = (): DeviceRecord[] => {
  const rows = getDb()
    .prepare(
      `SELECT * FROM devices
       ORDER BY COALESCE(last_seen_at, created_at) DESC, id ASC`
    )
    .all() as DeviceRow[];
  return rows.map(toDevice);
};

export const getDeviceAuthHash = (deviceId: string): string | null | undefined => {
  const row = getDb().prepare("SELECT api_key_hash FROM devices WHERE id = ?").get(deviceId) as
    | { api_key_hash: string | null }
    | undefined;
  return row?.api_key_hash;
};

export const getDevicePlantId = (deviceId: string): string | null => {
  const row = getDb().prepare("SELECT plant_id FROM devices WHERE id = ?").get(deviceId) as
    | { plant_id: string }
    | undefined;
  return row?.plant_id ?? null;
};

export const upsertPendingDevice = (
  deviceId: string,
  payload: Record<string, unknown>,
  rssi: number | null
): PendingDevice => {
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO pending_devices
       (id, first_seen_at, last_seen_at, latest_payload_json, rssi, claim_status)
       VALUES (?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         last_seen_at = excluded.last_seen_at,
         latest_payload_json = excluded.latest_payload_json,
         rssi = excluded.rssi,
         claim_status = CASE
           WHEN pending_devices.claim_status = 'claimed' THEN 'claimed'
           ELSE 'pending'
         END`
    )
    .run(deviceId, now, now, JSON.stringify(payload), rssi);
  return getPendingDevice(deviceId)!;
};

export const getPendingDevice = (deviceId: string): PendingDevice | null => {
  const row = getDb().prepare("SELECT * FROM pending_devices WHERE id = ?").get(deviceId) as
    | PendingDeviceRow
    | undefined;
  return row ? toPendingDevice(row) : null;
};

export const listPendingDevices = (): PendingDevice[] => {
  const rows = getDb()
    .prepare(
      "SELECT * FROM pending_devices WHERE claim_status = 'pending' ORDER BY last_seen_at DESC"
    )
    .all() as PendingDeviceRow[];
  return rows.map(toPendingDevice);
};

export const insertClaimedDevice = (
  deviceId: string,
  plantId: string,
  name: string,
  apiKeyHash: string
): DeviceRecord => {
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO devices (id, plant_id, name, api_key_hash, last_seen_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET
         plant_id = excluded.plant_id,
         name = excluded.name,
         api_key_hash = excluded.api_key_hash`
    )
    .run(deviceId, plantId, name, apiKeyHash, now);
  markPendingDevice(deviceId, "claimed");
  return getDevice(deviceId)!;
};

export const updateDeviceApiKeyHash = (
  deviceId: string,
  apiKeyHash: string
): DeviceRecord | null => {
  getDb()
    .prepare("UPDATE devices SET api_key_hash = ? WHERE id = ?")
    .run(apiKeyHash, deviceId);
  return getDevice(deviceId);
};

export const markPendingDevice = (
  deviceId: string,
  status: PendingDevice["claimStatus"]
): void => {
  getDb()
    .prepare("UPDATE pending_devices SET claim_status = ? WHERE id = ?")
    .run(status, deviceId);
};
