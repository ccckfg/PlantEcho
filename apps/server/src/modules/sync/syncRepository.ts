import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import type { CreateSyncEventInput, SyncEvent, SyncEventType } from "./syncTypes.js";
import { resourceFromType } from "./syncTypes.js";

type SyncEventRow = {
  id: number;
  type: SyncEventType;
  plant_id: string | null;
  payload_json: string;
  created_at: string;
};

const parsePayload = (text: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
};

const toEvent = (row: SyncEventRow): SyncEvent => ({
  id: row.id,
  type: row.type,
  resource: resourceFromType(row.type),
  plantId: row.plant_id,
  payload: parsePayload(row.payload_json),
  createdAt: row.created_at
});

export const createSyncEvent = (input: CreateSyncEventInput): SyncEvent => {
  const result = getDb().prepare(
    `INSERT INTO sync_events (type, plant_id, payload_json, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(input.type, input.plantId ?? null, JSON.stringify(input.payload ?? {}), nowIso());
  return getSyncEvent(Number(result.lastInsertRowid))!;
};

export const getSyncEvent = (id: number): SyncEvent | null => {
  const row = getDb().prepare("SELECT * FROM sync_events WHERE id = ?").get(id) as SyncEventRow | undefined;
  return row ? toEvent(row) : null;
};

export const listSyncEventsSince = (sinceId: number, limit = 200): SyncEvent[] => {
  const rows = getDb()
    .prepare("SELECT * FROM sync_events WHERE id > ? ORDER BY id ASC LIMIT ?")
    .all(Math.max(0, sinceId), Math.max(1, limit)) as SyncEventRow[];
  return rows.map(toEvent);
};

export const latestSyncEventId = (): number => {
  const row = getDb().prepare("SELECT MAX(id) AS id FROM sync_events").get() as
    | { id: number | null }
    | undefined;
  return row?.id ?? 0;
};
