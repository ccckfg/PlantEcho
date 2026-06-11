import {
  relationshipStages,
  type InnerState,
  type RelationshipStage,
  type RelationshipState
} from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type InnerRow = {
  plant_id: string;
  mood: string;
  concern: string;
  thought: string;
  source_turn: number | null;
  updated_at: string;
};

type RelationshipRow = {
  plant_id: string;
  stage: string;
  summary: string;
  evidence_memory_ids_json: string;
  updated_at: string;
};

const parseIds = (text: string): string[] => {
  try {
    const value = JSON.parse(text) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const stageFromText = (value: string): RelationshipStage =>
  relationshipStages.includes(value as RelationshipStage)
    ? value as RelationshipStage
    : "初识";

export const getInnerState = async (plantId: string): Promise<InnerState> => {
  const row = await getDb()
    .prepare("SELECT * FROM plant_inner_state WHERE plant_id = ?")
    .get<InnerRow>(plantId);
  return row
    ? {
        plantId: row.plant_id,
        mood: row.mood,
        concern: row.concern,
        thought: row.thought,
        sourceTurn: row.source_turn,
        updatedAt: row.updated_at
      }
    : { plantId, mood: "平静", concern: "", thought: "", sourceTurn: null, updatedAt: nowIso() };
};

export const upsertInnerState = async (
  plantId: string,
  input: Pick<InnerState, "mood" | "concern" | "thought" | "sourceTurn">
): Promise<InnerState> => {
  const now = nowIso();
  await getDb().prepare(
    `INSERT INTO plant_inner_state
     (plant_id, mood, concern, thought, source_turn, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(plant_id) DO UPDATE SET
       mood = excluded.mood,
       concern = excluded.concern,
       thought = excluded.thought,
       source_turn = excluded.source_turn,
       updated_at = excluded.updated_at`
  ).run(plantId, input.mood, input.concern, input.thought, input.sourceTurn, now);
  return getInnerState(plantId);
};

export const getRelationshipState = async (plantId: string): Promise<RelationshipState> => {
  const row = await getDb()
    .prepare("SELECT * FROM plant_relationship_state WHERE plant_id = ?")
    .get<RelationshipRow>(plantId);
  return row
    ? {
        plantId: row.plant_id,
        stage: stageFromText(row.stage),
        summary: row.summary,
        evidenceMemoryIds: parseIds(row.evidence_memory_ids_json),
        updatedAt: row.updated_at
      }
    : { plantId, stage: "初识", summary: "刚刚认识主人", evidenceMemoryIds: [], updatedAt: nowIso() };
};

export const upsertRelationshipState = async (
  plantId: string,
  input: Pick<RelationshipState, "stage" | "summary" | "evidenceMemoryIds">
): Promise<RelationshipState> => {
  const now = nowIso();
  await getDb().prepare(
    `INSERT INTO plant_relationship_state
     (plant_id, stage, summary, evidence_memory_ids_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(plant_id) DO UPDATE SET
       stage = excluded.stage,
       summary = excluded.summary,
       evidence_memory_ids_json = excluded.evidence_memory_ids_json,
       updated_at = excluded.updated_at`
  ).run(plantId, input.stage, input.summary, JSON.stringify(input.evidenceMemoryIds), now);
  return getRelationshipState(plantId);
};
