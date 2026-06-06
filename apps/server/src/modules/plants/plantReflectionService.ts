import type { PlantSummary } from "@dyn/shared";
import { listEpisodeMemories } from "../memory/repositories/memoryRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
import { getLayeredPlantState } from "../state/stateService.js";
import { getPlant } from "./plantRepository.js";

export interface PlantReflection {
  text: string;
  usedLlm: boolean;
  basis: string[];
}

const fallbackReflection = (plant: PlantSummary, basis: string[]): string => {
  const joined = basis.join("，");
  if (/离线|暂无/.test(joined)) return `${plant.name}提醒你：沉默也是生长的一部分。`;
  if (/偏干|缺水|口渴/.test(joined)) return "干渴让根向深处走，照料让绿意回到枝头。";
  if (/偏湿|过湿/.test(joined)) return "水太满时，根也需要一点呼吸的余地。";
  if (/光照偏弱|弱光/.test(joined)) return "向光不是急切，是每一天慢慢转身。";
  if (/光照过强|强光/.test(joined)) return "热烈也要留白，叶片才守得住清凉。";
  return "安静的生长，从来不急着证明春天。";
};

export const getPlantReflection = async (plantId: string): Promise<PlantReflection> => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);

  const readingState = getPlantReadingState(plantId);
  const state = getLayeredPlantState(plantId);
  const memories = listEpisodeMemories(plantId, 3);
  const basis = [
    state.inner.mood ? `心情：${state.inner.mood}` : "",
    state.inner.concern ? `关注：${state.inner.concern}` : "",
    readingState.health.facts.join("，"),
    readingState.health.issues.map((issue) => issue.label).join("，"),
    ...memories.map((memory) => `记忆：${memory.title}`)
  ].filter(Boolean);

  return { text: fallbackReflection(plant, basis), usedLlm: false, basis };
};
