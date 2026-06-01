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
  care_profile_json: string;
};

export interface CreatePlantInput {
  name: string;
  species: string;
  location?: string;
  avatarUrl?: string | null;
  personaProfileId?: string;
  careProfile?: CareProfile;
}

export interface UpdatePlantInput {
  name?: string;
  careProfile?: CareProfile;
  avatarUrl?: string | null;
}

export const toPlantSummary = (row: PlantRow): PlantSummary => ({
  id: row.id,
  name: row.name,
  species: row.species,
  location: row.location,
  avatarUrl: row.avatar_url,
  careProfile: careProfileSchema.parse(JSON.parse(row.care_profile_json))
});

export const listPlants = (): PlantSummary[] => {
  const rows = getDb().prepare("SELECT * FROM plants ORDER BY created_at ASC").all() as PlantRow[];
  return rows.map(toPlantSummary);
};

export const getPlant = (plantId: string): PlantSummary | null => {
  const row = getDb().prepare("SELECT * FROM plants WHERE id = ?").get(plantId) as PlantRow | undefined;
  return row ? toPlantSummary(row) : null;
};

export const getPlantPersonaId = (plantId: string): string => {
  const row = getDb().prepare("SELECT persona_profile_id FROM plants WHERE id = ?").get(plantId) as
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
       (id, name, species, persona_profile_id, avatar_url, location,
        care_profile_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name,
      input.species,
      input.personaProfileId ?? "pothos",
      input.avatarUrl ?? null,
      input.location ?? "",
      JSON.stringify(careProfile),
      now,
      now
    );
  getDb()
    .prepare(
      "INSERT INTO plant_status (plant_id, mood, relationship, focus, last_summary, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, "平静", "刚刚认识主人", "适应新的环境记录", "", now);
  return getPlant(id)!;
};

export const updatePlant = (plantId: string, input: UpdatePlantInput): PlantSummary | null => {
  const existing = getPlant(plantId);
  if (!existing) return null;
  const nextName = input.name ?? existing.name;
  const nextProfile = input.careProfile ?? existing.careProfile;
  const nextAvatarUrl = input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl;
  getDb()
    .prepare("UPDATE plants SET name = ?, care_profile_json = ?, avatar_url = ?, updated_at = ? WHERE id = ?")
    .run(nextName, JSON.stringify(nextProfile), nextAvatarUrl, nowIso(), plantId);
  return getPlant(plantId);
};
