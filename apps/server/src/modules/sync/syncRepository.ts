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

export const createSyncEvent = async (input: CreateSyncEventInput): Promise<SyncEvent> => {
  const result = await getDb().prepare(
    `INSERT INTO sync_events (type, plant_id, payload_json, created_at)
     VALUES (?, ?, ?, ?)
     RETURNING id`
  ).run(input.type, input.plantId ?? null, JSON.stringify(input.payload ?? {}), nowIso());
  return (await getSyncEvent(Number(result.lastInsertRowid)))!;
};

export const getSyncEvent = async (id: number): Promise<SyncEvent | null> => {
  const row = await getDb().prepare("SELECT * FROM sync_events WHERE id = ?").get<SyncEventRow>(id);
  return row ? toEvent(row) : null;
};

export const listSyncEventsSince = async (sinceId: number, limit = 200): Promise<SyncEvent[]> => {
  const rows = await getDb()
    .prepare("SELECT * FROM sync_events WHERE id > ? ORDER BY id ASC LIMIT ?")
    .all<SyncEventRow>(Math.max(0, sinceId), Math.max(1, limit));
  return rows.map(toEvent);
};

export const latestSyncEventId = async (): Promise<number> => {
  const row = await getDb().prepare("SELECT MAX(id) AS id FROM sync_events").get<{ id: number | null }>();
  return row?.id ?? 0;
};
