import type { PlantIntention } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

export const closeInnerStateForIntention = async (
  intention: PlantIntention,
  sourceTurn: number
): Promise<void> => {
  if (intention.sourceType !== "inner" || !intention.sourceId) return;
  const originalTurn = Number(intention.sourceId);
  if (!Number.isInteger(originalTurn)) return;
  await getDb().prepare(
    `UPDATE plant_inner_state
     SET concern = '', thought = '', source_turn = ?, updated_at = ?
     WHERE plant_id = ? AND source_turn = ?`
  ).run(sourceTurn, nowIso(), intention.plantId, originalTurn);
};
