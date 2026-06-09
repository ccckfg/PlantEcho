import {
  scheduleDetectAndConsolidate,
  scheduleSessionClosure
} from "../memory/consolidation/consolidationJob.js";
import { rememberAssistantMessage } from "../memory/consolidation/ruleConsolidator.js";
import { getPlant } from "../plants/plantRepository.js";

export const rememberProactiveMessage = (
  plantId: string,
  turn: number,
  content: string,
  sourceType: string
): void => {
  rememberAssistantMessage(plantId, turn, content, sourceType);
  const plant = getPlant(plantId);
  if (!plant) return;
  scheduleDetectAndConsolidate(plantId, plant.name, turn);
  scheduleSessionClosure(plantId, plant.name, turn);
};
