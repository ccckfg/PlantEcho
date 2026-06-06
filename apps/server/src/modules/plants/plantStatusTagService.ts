import { listEpisodeMemories } from "../memory/repositories/memoryRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
import { getLayeredPlantState } from "../state/stateService.js";
import { getPlant } from "./plantRepository.js";

export interface PlantStatusTags {
  tags: string[];
  usedLlm: boolean;
  basis: string[];
}

const fallbackTags = (basis: string[]): string[] => {
  const joined = basis.join("，");
  if (/离线|暂无/.test(joined)) return ["待感知"];
  if (/偏干|缺水|口渴/.test(joined)) return ["想喝水"];
  if (/偏湿|过湿/.test(joined)) return ["慢呼吸"];
  if (/光照偏弱|弱光/.test(joined)) return ["向光中"];
  if (/光照过强|强光/.test(joined)) return ["避烈日"];
  return ["状态好"];
};

export const getPlantStatusTags = async (plantId: string): Promise<PlantStatusTags> => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);

  const readingState = getPlantReadingState(plantId);
  const state = getLayeredPlantState(plantId);
  const memories = listEpisodeMemories(plantId, 3);
  const basis = [
    `植物：${plant.name}（${plant.species}）`,
    state.inner.mood ? `心情：${state.inner.mood}` : "",
    state.inner.concern ? `关注：${state.inner.concern}` : "",
    readingState.health.facts.join("，"),
    readingState.health.issues.map((issue) => issue.label).join("，"),
    ...memories.map((memory) => `记忆：${memory.title}`)
  ].filter(Boolean);

  return { tags: fallbackTags(basis), usedLlm: false, basis };
};
