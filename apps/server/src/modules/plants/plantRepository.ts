import { randomUUID } from "node:crypto";
import { careProfileSchema, type CareProfile, type PlantSummary } from "@dyn/shared";
import { defaultCareProfile } from "../../config/careProfiles.js";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type PlantRow = {
  id: string;
  name: string;
  species: string;
  persona_profile_id: string;
  avatar_url: string | null;
  location: string;
  background_info: string;
  care_profile_json: string;
  status: string;
  deleted_at: string | null;
};

export interface CreatePlantInput {
  name: string;
  species: string;
  location?: string;
  backgroundInfo?: string;
  avatarUrl?: string | null;
  personaProfileId?: string;
  careProfile?: CareProfile;
}

export interface UpdatePlantInput {
  name?: string;
  backgroundInfo?: string;
  careProfile?: CareProfile;
  avatarUrl?: string | null;
}

export const toPlantSummary = (row: PlantRow): PlantSummary => ({
  id: row.id,
  name: row.name,
  species: row.species,
  location: row.location,
  backgroundInfo: row.background_info,
  avatarUrl: row.avatar_url,
  careProfile: careProfileSchema.parse(JSON.parse(row.care_profile_json))
});

const activePlantClause = "COALESCE(status, 'active') <> 'deleted'";

export const listPlants = (): PlantSummary[] => {
  const rows = getDb()
    .prepare(`SELECT * FROM plants WHERE ${activePlantClause} ORDER BY created_at ASC`)
    .all() as PlantRow[];
  return rows.map(toPlantSummary);
};

export const getPlant = (plantId: string, includeDeleted = false): PlantSummary | null => {
  const sql = includeDeleted
    ? "SELECT * FROM plants WHERE id = ?"
    : `SELECT * FROM plants WHERE id = ? AND ${activePlantClause}`;
  const row = getDb().prepare(sql).get(plantId) as PlantRow | undefined;
  return row ? toPlantSummary(row) : null;
};

export const getPlantPersonaId = (plantId: string): string => {
  const row = getDb().prepare(`SELECT persona_profile_id FROM plants WHERE id = ? AND ${activePlantClause}`).get(plantId) as
    | { persona_profile_id: string }
    | undefined;
  return row?.persona_profile_id ?? "pothos";
};

export const createPlant = (input: CreatePlantInput): PlantSummary => {
  const now = nowIso();
  const id = randomUUID();
  const careProfile = input.careProfile ?? defaultCareProfile;
  getDb()
    .prepare(
      `INSERT INTO plants
       (id, name, species, persona_profile_id, avatar_url, location, background_info,
        care_profile_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name,
      input.species,
      input.personaProfileId ?? "pothos",
      input.avatarUrl ?? null,
      input.location ?? "",
      input.backgroundInfo ?? "",
      JSON.stringify(careProfile),
      now,
      now
    );
  getDb()
    .prepare(
      "INSERT INTO plant_inner_state (plant_id, mood, concern, thought, source_turn, updated_at) VALUES (?, ?, '', '', NULL, ?)"
    )
    .run(id, "平静", now);
  getDb()
    .prepare(
      "INSERT INTO plant_relationship_state (plant_id, stage, summary, evidence_memory_ids_json, updated_at) VALUES (?, '初识', ?, '[]', ?)"
    )
    .run(id, "刚刚认识主人", now);
  return getPlant(id)!;
};

export const updatePlant = (plantId: string, input: UpdatePlantInput): PlantSummary | null => {
  const existing = getPlant(plantId);
  if (!existing) return null;
  const nextName = input.name ?? existing.name;
  const nextProfile = input.careProfile ?? existing.careProfile;
  const nextAvatarUrl = input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl;
  const nextBackgroundInfo = input.backgroundInfo ?? existing.backgroundInfo;
  getDb()
    .prepare(
      "UPDATE plants SET name = ?, care_profile_json = ?, avatar_url = ?, background_info = ?, updated_at = ? WHERE id = ?"
    )
    .run(nextName, JSON.stringify(nextProfile), nextAvatarUrl, nextBackgroundInfo, nowIso(), plantId);
  return getPlant(plantId);
};

export const deletePlant = (plantId: string): PlantSummary | null => {
  const existing = getPlant(plantId);
  if (!existing) return null;
  const now = nowIso();
  getDb()
    .prepare(
      `UPDATE plants
       SET status = 'deleted', deleted_at = ?, updated_at = ?
       WHERE id = ? AND ${activePlantClause}`
    )
    .run(now, now, plantId);
  return getPlant(plantId, true);
};

export const restorePlant = (plantId: string): PlantSummary | null => {
  const existing = getPlant(plantId, true);
  if (!existing) return null;
  getDb()
    .prepare("UPDATE plants SET status = 'active', deleted_at = NULL, updated_at = ? WHERE id = ?")
    .run(nowIso(), plantId);
  return getPlant(plantId);
};
