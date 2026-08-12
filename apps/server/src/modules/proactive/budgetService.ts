import { proactiveConfig } from "../../config/proactive.js";
import {
  getPlantBudgetIdentity,
  inspectBudget,
  returnBudgetToken,
  takeBudgetToken,
  type Talkativeness
} from "./budgetRepository.js";

export interface PlantBudget {
  scopeId: string;
  mode: Talkativeness;
  capacity: number;
  tokens: number;
}

const descriptor = async (plantId: string): Promise<Omit<PlantBudget, "tokens">> => {
  const identity = await getPlantBudgetIdentity(plantId);
  const mode = identity.talkativeness ?? proactiveConfig.defaultTalkativeness;
  return {
    scopeId: identity.scopeId,
    mode,
    capacity: proactiveConfig.budgetCapacity[mode]
  };
};

export const getPlantBudget = async (plantId: string): Promise<PlantBudget> => {
  const value = await descriptor(plantId);
  return {
    ...value,
    tokens: await inspectBudget(
      value.scopeId,
      value.capacity,
      proactiveConfig.budgetRefillWindowMs
    )
  };
};

export const consumePlantBudget = async (plantId: string): Promise<PlantBudget | null> => {
  const value = await descriptor(plantId);
  const consumed = await takeBudgetToken(
    value.scopeId,
    value.capacity,
    proactiveConfig.budgetRefillWindowMs
  );
  return consumed ? { ...value, tokens: 0 } : null;
};

export const refundPlantBudget = async (plantId: string): Promise<void> => {
  const value = await descriptor(plantId);
  await returnBudgetToken(
    value.scopeId,
    value.capacity,
    proactiveConfig.budgetRefillWindowMs
  );
};
