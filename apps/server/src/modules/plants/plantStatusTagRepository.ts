import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

export interface StoredPlantStatusTags {
  plantId: string;
  tags: string[];
  sourceTurn: number | null;
  createdAt: string;
  updatedAt: string;
}

type PlantStatusTagRow = {
  plant_id: string;
  tags_json: string;
  source_turn: number | null;
  created_at: string;
  updated_at: string;
};

const parseTags = (text: string): string[] => {
  try {
    const value = JSON.parse(text) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const toStored = (row: PlantStatusTagRow): StoredPlantStatusTags => ({
  plantId: row.plant_id,
  tags: parseTags(row.tags_json),
  sourceTurn: row.source_turn,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getStoredPlantStatusTags = (plantId: string): StoredPlantStatusTags | null => {
  const row = getDb()
    .prepare("SELECT * FROM plant_status_tags WHERE plant_id = ?")
    .get(plantId) as PlantStatusTagRow | undefined;
  return row ? toStored(row) : null;
};

export const upsertPlantStatusTags = (
  plantId: string,
  tags: string[],
  sourceTurn: number | null
): StoredPlantStatusTags => {
  const now = nowIso();
  getDb().prepare(
    `INSERT INTO plant_status_tags
     (plant_id, tags_json, source_turn, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(plant_id) DO UPDATE SET
       tags_json = excluded.tags_json,
       source_turn = excluded.source_turn,
       updated_at = excluded.updated_at`
  ).run(plantId, JSON.stringify(tags), sourceTurn, now, now);
  return getStoredPlantStatusTags(plantId)!;
};
