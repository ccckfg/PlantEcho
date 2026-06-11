import {
  scheduleDetectAndConsolidate,
  scheduleSessionClosure
} from "../memory/consolidation/consolidationJob.js";
import { rememberAssistantMessage } from "../memory/consolidation/ruleConsolidator.js";
import { getPlant } from "../plants/plantRepository.js";

export const rememberProactiveMessage = async (
  plantId: string,
  turn: number,
  content: string,
  sourceType: string
): Promise<void> => {
  await rememberAssistantMessage(plantId, turn, content, sourceType);
  const plant = await getPlant(plantId);
  if (!plant) return;
  await scheduleDetectAndConsolidate(plantId, plant.name, turn);
  await scheduleSessionClosure(plantId, plant.name, turn);
};
