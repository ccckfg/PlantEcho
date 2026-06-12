import type { DeviceRecord, DeviceStatus, PendingDevice } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type DeviceRow = {
  id: string;
  plant_id: string;
  name: string;
  api_key_hash: string | null;
  status: DeviceStatus;
  last_seen_at: string | null;
  disabled_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

type PendingDeviceRow = {
  id: string;
  user_id: string | null;
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
  status: row.status,
  lastSeenAt: row.last_seen_at,
  disabledAt: row.disabled_at,
  deletedAt: row.deleted_at,
  createdAt: row.created_at
});

const toPendingDevice = (row: PendingDeviceRow): PendingDevice => ({
  id: row.id,
  userId: row.user_id,
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  latestPayload: parseJsonObject(row.latest_payload_json),
  rssi: row.rssi,
  claimStatus: row.claim_status
});

const deviceOwnerClause = (userId?: string | null): string =>
  userId ? " AND plant_id IN (SELECT id FROM plants WHERE user_id = ?)" : "";

const deviceOwnerParams = (userId?: string | null): string[] => userId ? [userId] : [];

export const getDevice = async (
  deviceId: string,
  includeDeleted = false,
  userId?: string | null
): Promise<DeviceRecord | null> => {
  const row = userId
    ? await getDb()
      .prepare(
        `SELECT d.* FROM devices d
         INNER JOIN plants p ON p.id = d.plant_id
         WHERE d.id = ? AND p.user_id = ?`
      )
      .get<DeviceRow>(deviceId, userId)
    : await getDb().prepare("SELECT * FROM devices WHERE id = ?").get<DeviceRow>(deviceId);
  if (!row || (!includeDeleted && row.status === "deleted")) return null;
  return toDevice(row);
};

export const listDevices = async (userId?: string | null): Promise<DeviceRecord[]> => {
  const sql = userId
    ? `SELECT d.* FROM devices d
       INNER JOIN plants p ON p.id = d.plant_id
       WHERE d.status <> 'deleted' AND p.user_id = ?
       ORDER BY COALESCE(d.last_seen_at, d.created_at) DESC, d.id ASC`
    : `SELECT * FROM devices
       WHERE status <> 'deleted'
       ORDER BY COALESCE(last_seen_at, created_at) DESC, id ASC`;
  const rows = userId
    ? await getDb().prepare(sql).all<DeviceRow>(userId)
    : await getDb().prepare(sql).all<DeviceRow>();
  return rows.map(toDevice);
};

export const getDeviceAuthHash = async (deviceId: string): Promise<string | null | undefined> => {
  const row = await getDb()
    .prepare("SELECT api_key_hash, status FROM devices WHERE id = ?")
    .get<{ api_key_hash: string | null; status: DeviceStatus }>(deviceId);
  return row?.status === "active" ? row.api_key_hash : undefined;
};

export const getDevicePlantId = async (deviceId: string): Promise<string | null> => {
  const row = await getDb().prepare("SELECT plant_id FROM devices WHERE id = ?").get<{ plant_id: string }>(deviceId);
  return row?.plant_id ?? null;
};

export const upsertPendingDevice = async (
  deviceId: string,
  payload: Record<string, unknown>,
  rssi: number | null,
  userId: string | null
): Promise<PendingDevice> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO pending_devices
       (id, user_id, first_seen_at, last_seen_at, latest_payload_json, rssi, claim_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         user_id = COALESCE(excluded.user_id, pending_devices.user_id),
         last_seen_at = excluded.last_seen_at,
         latest_payload_json = excluded.latest_payload_json,
         rssi = excluded.rssi,
         claim_status = CASE
           WHEN pending_devices.claim_status = 'claimed' THEN 'claimed'
           ELSE 'pending'
         END`
    )
    .run(deviceId, userId, now, now, JSON.stringify(payload), rssi);
  return (await getPendingDevice(deviceId))!;
};

const normalizeUserIdentifiers = (
  userIdentifiers: string | readonly string[] | null
): string[] => {
  if (!userIdentifiers) return [];
  const values = Array.isArray(userIdentifiers) ? userIdentifiers : [userIdentifiers];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
};

export const getPendingDevice = async (
  deviceId: string,
  userIdentifiers: string | readonly string[] | null = null
): Promise<PendingDevice | null> => {
  const identifiers = normalizeUserIdentifiers(userIdentifiers);
  const placeholders = identifiers.map(() => "?").join(", ");
  const query = identifiers.length
    ? `SELECT * FROM pending_devices
       WHERE id = ? AND (user_id IS NULL OR user_id IN (${placeholders}))`
    : "SELECT * FROM pending_devices WHERE id = ?";
  const args = identifiers.length ? [deviceId, ...identifiers] : [deviceId];
  const row = await getDb().prepare(query).get<PendingDeviceRow>(...args);
  return row ? toPendingDevice(row) : null;
};

export const listPendingDevices = async (
  userIdentifiers: string | readonly string[] | null = null
): Promise<PendingDevice[]> => {
  const identifiers = normalizeUserIdentifiers(userIdentifiers);
  const placeholders = identifiers.map(() => "?").join(", ");
  const query = identifiers.length
    ? `SELECT * FROM pending_devices
       WHERE claim_status = 'pending' AND (user_id IS NULL OR user_id IN (${placeholders}))
       ORDER BY last_seen_at DESC`
    : "SELECT * FROM pending_devices WHERE claim_status = 'pending' ORDER BY last_seen_at DESC";
  const rows = identifiers.length
    ? await getDb().prepare(query).all<PendingDeviceRow>(...identifiers)
    : await getDb().prepare(query).all<PendingDeviceRow>();
  return rows.map(toPendingDevice);
};

export const insertClaimedDevice = async (
  deviceId: string,
  plantId: string,
  name: string,
  apiKeyHash: string
): Promise<DeviceRecord> => {
  const now = nowIso();
  await getDb().transaction(async (db) => {
    await db.prepare(
      `INSERT INTO devices (id, plant_id, name, api_key_hash, last_seen_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET
         plant_id = excluded.plant_id,
         name = excluded.name,
         api_key_hash = excluded.api_key_hash,
         status = 'active',
         disabled_at = NULL,
         deleted_at = NULL`
    )
    .run(deviceId, plantId, name, apiKeyHash, now);
    await db.prepare("UPDATE pending_devices SET claim_status = ? WHERE id = ?")
      .run("claimed", deviceId);
  });
  return (await getDevice(deviceId))!;
};

export const updateDeviceApiKeyHash = async (
  deviceId: string,
  apiKeyHash: string,
  userId?: string | null
): Promise<DeviceRecord | null> => {
  await getDb()
    .prepare(`UPDATE devices SET api_key_hash = ? WHERE id = ?${deviceOwnerClause(userId)}`)
    .run(apiKeyHash, deviceId, ...deviceOwnerParams(userId));
  return getDevice(deviceId, false, userId);
};

export const updateDeviceStatus = async (
  deviceId: string,
  status: Exclude<DeviceStatus, "deleted">,
  userId?: string | null
): Promise<DeviceRecord | null> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `UPDATE devices SET
         status = ?,
         disabled_at = CASE WHEN ? = 'disabled' THEN ? ELSE NULL END,
         deleted_at = NULL
       WHERE id = ?${deviceOwnerClause(userId)}`
    )
    .run(status, status, now, deviceId, ...deviceOwnerParams(userId));
  return getDevice(deviceId, false, userId);
};

export const softDeleteDevice = async (
  deviceId: string,
  userId?: string | null
): Promise<DeviceRecord | null> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `UPDATE devices SET status = 'deleted', deleted_at = ?, disabled_at = NULL
       WHERE id = ? AND status <> 'deleted'${deviceOwnerClause(userId)}`
    )
    .run(now, deviceId, ...deviceOwnerParams(userId));
  return getDevice(deviceId, true, userId);
};

export const markPendingDevice = async (
  deviceId: string,
  status: PendingDevice["claimStatus"]
): Promise<void> => {
  await getDb()
    .prepare("UPDATE pending_devices SET claim_status = ? WHERE id = ?")
    .run(status, deviceId);
};
