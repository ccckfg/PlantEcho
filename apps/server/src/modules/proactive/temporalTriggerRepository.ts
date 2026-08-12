import {
  relationshipStages,
  type RelationshipStage
} from "@dyn/shared";
import { getDb } from "../../db/connection.js";

export interface TemporalPlantFacts {
  plantId: string;
  plantName: string;
  adoptedAt: string;
  relationshipStage: RelationshipStage;
  latestUserMessageId: string | null;
  latestUserMessageAt: string | null;
}

type TemporalFactsRow = {
  plant_id: string;
  plant_name: string;
  adopted_at: string;
  relationship_stage: string;
  latest_user_message_id: number | string | null;
  latest_user_message_at: string | null;
};

const relationshipStage = (value: string): RelationshipStage =>
  relationshipStages.includes(value as RelationshipStage)
    ? value as RelationshipStage
    : "初识";

export const getTemporalPlantFacts = async (
  plantId: string
): Promise<TemporalPlantFacts | null> => {
  const row = await getDb().prepare(
    `SELECT
       p.id AS plant_id,
       p.name AS plant_name,
       p.created_at AS adopted_at,
       COALESCE(r.stage, '初识') AS relationship_stage,
       (SELECT m.id FROM messages m
        WHERE m.plant_id = p.id AND m.role = 'user'
        ORDER BY m.id DESC LIMIT 1) AS latest_user_message_id,
       (SELECT m.created_at FROM messages m
        WHERE m.plant_id = p.id AND m.role = 'user'
        ORDER BY m.id DESC LIMIT 1) AS latest_user_message_at
     FROM plants p
     LEFT JOIN plant_relationship_state r ON r.plant_id = p.id
     WHERE p.id = ? AND COALESCE(p.status, 'active') <> 'deleted'`
  ).get<TemporalFactsRow>(plantId);
  if (!row) return null;
  return {
    plantId: row.plant_id,
    plantName: row.plant_name,
    adoptedAt: row.adopted_at,
    relationshipStage: relationshipStage(row.relationship_stage),
    latestUserMessageId: row.latest_user_message_id === null
      ? null
      : String(row.latest_user_message_id),
    latestUserMessageAt: row.latest_user_message_at
  };
};
