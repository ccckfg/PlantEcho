import {
  getConsolidationState,
  updateConsolidationState
} from "../repositories/consolidationRepository.js";

export const notePendingConsolidation = (plantId: string, turn: number): void => {
  const state = getConsolidationState(plantId);
  updateConsolidationState(plantId, { pendingTurn: Math.max(state.pendingTurn ?? 0, turn) });
};

export const startConsolidationRun = (plantId: string, turn: number): number => {
  const state = getConsolidationState(plantId);
  const runTurn = Math.max(state.pendingTurn ?? 0, turn);
  updateConsolidationState(plantId, { active: true, pendingTurn: null, lastError: "" });
  return runTurn;
};

export const finishConsolidationRun = (
  plantId: string,
  turn: number,
  error = ""
): number | null => {
  const state = getConsolidationState(plantId);
  const pendingTurn = state.pendingTurn && state.pendingTurn > turn ? state.pendingTurn : null;
  updateConsolidationState(plantId, {
    active: false,
    pendingTurn: null,
    lastCompletedTurn: error ? state.lastCompletedTurn : turn,
    lastError: error
  });
  return pendingTurn;
};
