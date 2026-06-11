import { getDb } from "../../../db/connection.js";
import { nowIso } from "../../../shared/time.js";
import type { ConsolidationState } from "../domain/types.js";

type ConsolidationStateRow = {
  plant_id: string;
  active: number;
  pending_turn: number | null;
  last_completed_turn: number;
  last_error: string;
  updated_at: string;
};

const toState = (row: ConsolidationStateRow): ConsolidationState => ({
  plantId: row.plant_id,
  active: Boolean(row.active),
  pendingTurn: row.pending_turn,
  lastCompletedTurn: row.last_completed_turn,
  lastError: row.last_error,
  updatedAt: row.updated_at
});

export const getConsolidationState = async (plantId: string): Promise<ConsolidationState> => {
  const row = await getDb()
    .prepare("SELECT * FROM memory_consolidation_state WHERE plant_id = ?")
    .get<ConsolidationStateRow>(plantId);
  if (row) return toState(row);
  const now = nowIso();
  await getDb().prepare(
    `INSERT INTO memory_consolidation_state
     (plant_id, active, pending_turn, last_completed_turn, last_error, updated_at)
     VALUES (?, 0, NULL, 0, '', ?)`
  ).run(plantId, now);
  return {
    plantId,
    active: false,
    pendingTurn: null,
    lastCompletedTurn: 0,
    lastError: "",
    updatedAt: now
  };
};

export const updateConsolidationState = async (
  plantId: string,
  fields: Partial<Omit<ConsolidationState, "plantId" | "updatedAt">>
): Promise<ConsolidationState> => {
  const current = await getConsolidationState(plantId);
  const next = {
    active: fields.active ?? current.active,
    pendingTurn: fields.pendingTurn === undefined ? current.pendingTurn : fields.pendingTurn,
    lastCompletedTurn: fields.lastCompletedTurn ?? current.lastCompletedTurn,
    lastError: fields.lastError ?? current.lastError
  };
  await getDb().prepare(
    `UPDATE memory_consolidation_state
     SET active = ?, pending_turn = ?, last_completed_turn = ?, last_error = ?, updated_at = ?
     WHERE plant_id = ?`
  ).run(
    next.active ? 1 : 0,
    next.pendingTurn,
    next.lastCompletedTurn,
    next.lastError,
    nowIso(),
    plantId
  );
  return getConsolidationState(plantId);
};
