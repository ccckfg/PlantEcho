import {
  getConsolidationState,
  updateConsolidationState
} from "../repositories/consolidationRepository.js";

export const notePendingConsolidation = async (plantId: string, turn: number): Promise<void> => {
  const state = await getConsolidationState(plantId);
  await updateConsolidationState(plantId, { pendingTurn: Math.max(state.pendingTurn ?? 0, turn) });
};

export const startConsolidationRun = async (plantId: string, turn: number): Promise<number> => {
  const state = await getConsolidationState(plantId);
  const runTurn = Math.max(state.pendingTurn ?? 0, turn);
  await updateConsolidationState(plantId, { active: true, pendingTurn: null, lastError: "" });
  return runTurn;
};

export const finishConsolidationRun = async (
  plantId: string,
  turn: number,
  error = ""
): Promise<number | null> => {
  const state = await getConsolidationState(plantId);
  const pendingTurn = state.pendingTurn && state.pendingTurn > turn ? state.pendingTurn : null;
  await updateConsolidationState(plantId, {
    active: false,
    pendingTurn: null,
    lastCompletedTurn: error ? state.lastCompletedTurn : turn,
    lastError: error
  });
  return pendingTurn;
};
