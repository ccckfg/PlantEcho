import { randomUUID } from "node:crypto";
import { careProfileSchema, type CareProfile, type PlantSummary } from "@dyn/shared";
import { defaultCareProfile } from "../../config/careProfiles.js";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type PlantRow = {
  id: string;
  user_id: string | null;
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
  userId?: string | null;
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

const ownerClause = (userId?: string | null): string => userId ? " AND user_id = ?" : "";
const ownerParams = (userId?: string | null): string[] => userId ? [userId] : [];

export const listPlants = async (userId?: string | null): Promise<PlantSummary[]> => {
  const rows = await getDb()
    .prepare(`SELECT * FROM plants WHERE ${activePlantClause}${ownerClause(userId)} ORDER BY created_at ASC`)
    .all<PlantRow>(...ownerParams(userId));
  return rows.map(toPlantSummary);
};

export const getPlant = async (
  plantId: string,
  includeDeleted = false,
  userId?: string | null
): Promise<PlantSummary | null> => {
  const sql = includeDeleted
    ? `SELECT * FROM plants WHERE id = ?${ownerClause(userId)}`
    : `SELECT * FROM plants WHERE id = ? AND ${activePlantClause}${ownerClause(userId)}`;
  const row = await getDb().prepare(sql).get<PlantRow>(plantId, ...ownerParams(userId));
  return row ? toPlantSummary(row) : null;
};

export const createPlant = async (input: CreatePlantInput): Promise<PlantSummary> => {
  const now = nowIso();
  const id = randomUUID();
  const careProfile = input.careProfile ?? defaultCareProfile;
  await getDb().transaction(async (db) => {
    await db.prepare(
      `INSERT INTO plants
       (id, user_id, name, species, persona_profile_id, avatar_url, location, background_info,
        care_profile_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.userId ?? null,
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
    await db.prepare(
      "INSERT INTO plant_inner_state (plant_id, mood, concern, thought, source_turn, updated_at) VALUES (?, ?, '', '', NULL, ?)"
    )
    .run(id, "平静", now);
    await db.prepare(
      "INSERT INTO plant_relationship_state (plant_id, stage, summary, evidence_memory_ids_json, updated_at) VALUES (?, '初识', ?, '[]', ?)"
    )
    .run(id, "刚刚认识主人", now);
  });
  return (await getPlant(id))!;
};

export const updatePlant = async (
  plantId: string,
  input: UpdatePlantInput,
  userId?: string | null
): Promise<PlantSummary | null> => {
  const existing = await getPlant(plantId, false, userId);
  if (!existing) return null;
  const nextName = input.name ?? existing.name;
  const nextProfile = input.careProfile ?? existing.careProfile;
  const nextAvatarUrl = input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl;
  const nextBackgroundInfo = input.backgroundInfo ?? existing.backgroundInfo;
  await getDb()
    .prepare(
      `UPDATE plants
       SET name = ?, care_profile_json = ?, avatar_url = ?, background_info = ?, updated_at = ?
       WHERE id = ?${ownerClause(userId)}`
    )
    .run(
      nextName,
      JSON.stringify(nextProfile),
      nextAvatarUrl,
      nextBackgroundInfo,
      nowIso(),
      plantId,
      ...ownerParams(userId)
    );
  return getPlant(plantId, false, userId);
};

export const deletePlant = async (plantId: string, userId?: string | null): Promise<PlantSummary | null> => {
  const existing = await getPlant(plantId, false, userId);
  if (!existing) return null;
  const now = nowIso();
  await getDb()
    .prepare(
      `UPDATE plants
       SET status = 'deleted', deleted_at = ?, updated_at = ?
       WHERE id = ? AND ${activePlantClause}${ownerClause(userId)}`
    )
    .run(now, now, plantId, ...ownerParams(userId));
  return getPlant(plantId, true, userId);
};

export const restorePlant = async (plantId: string, userId?: string | null): Promise<PlantSummary | null> => {
  const existing = await getPlant(plantId, true, userId);
  if (!existing) return null;
  await getDb()
    .prepare(`UPDATE plants SET status = 'active', deleted_at = NULL, updated_at = ? WHERE id = ?${ownerClause(userId)}`)
    .run(nowIso(), plantId, ...ownerParams(userId));
  return getPlant(plantId, false, userId);
};

export const assignUnownedPlantsToUser = async (userId: string): Promise<void> => {
  await getDb()
    .prepare("UPDATE plants SET user_id = ?, updated_at = ? WHERE user_id IS NULL")
    .run(userId, nowIso());
};
