import type { PlantStatus } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import { publishSyncEvent } from "../sync/syncBus.js";

export type { PlantStatus };

type StatusRow = {
  plant_id: string;
  mood: string;
  relationship: string;
  focus: string;
  last_summary: string;
  updated_at: string;
};

const toStatus = (row: StatusRow): PlantStatus => ({
  plantId: row.plant_id,
  mood: row.mood,
  relationship: row.relationship,
  focus: row.focus,
  lastSummary: row.last_summary,
  updatedAt: row.updated_at
});

export const getPlantStatus = (plantId: string): PlantStatus | null => {
  const row = getDb().prepare("SELECT * FROM plant_status WHERE plant_id = ?").get(plantId) as
    | StatusRow
    | undefined;
  return row ? toStatus(row) : null;
};

export const updatePlantStatus = (
  plantId: string,
  fields: Partial<Omit<PlantStatus, "plantId" | "updatedAt">>
): PlantStatus => {
  const current = getPlantStatus(plantId);
  const next = {
    mood: fields.mood ?? current?.mood ?? "平静",
    relationship: fields.relationship ?? current?.relationship ?? "正在熟悉主人",
    focus: fields.focus ?? current?.focus ?? "观察环境变化",
    lastSummary: fields.lastSummary ?? current?.lastSummary ?? ""
  };
  getDb()
    .prepare(
      `INSERT INTO plant_status (plant_id, mood, relationship, focus, last_summary, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(plant_id) DO UPDATE SET
         mood = excluded.mood,
         relationship = excluded.relationship,
         focus = excluded.focus,
         last_summary = excluded.last_summary,
         updated_at = excluded.updated_at`
    )
    .run(plantId, next.mood, next.relationship, next.focus, next.lastSummary, nowIso());
  publishSyncEvent({
    type: "status.changed",
    plantId,
    payload: { plantId }
  });
  return getPlantStatus(plantId)!;
};
