import { completeJson, isLlmConfigured } from "../llm/client.js";
import { listEpisodeMemories } from "../memory/repositories/memoryRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
import { getPlant } from "./plantRepository.js";
import { getPlantStatus } from "./statusRepository.js";

export interface PlantStatusTags {
  tags: string[];
  usedLlm: boolean;
  basis: string[];
}

const cleanTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/[，,。.!！?？\s"'“”「」『』]/g, "").slice(0, 4))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 2);
};

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
  const status = getPlantStatus(plantId);
  const memories = listEpisodeMemories(plantId, 3);
  const basis = [
    `植物：${plant.name}（${plant.species}）`,
    status?.mood ? `心情：${status.mood}` : "",
    status?.focus ? `关注：${status.focus}` : "",
    readingState.health.facts.join("，"),
    readingState.health.issues.map((issue) => issue.label).join("，"),
    ...memories.map((memory) => `记忆：${memory.title}`)
  ].filter(Boolean);

  if (isLlmConfigured()) {
    try {
      const result = await completeJson<unknown>(
        [
          {
            role: "system",
            content:
              "你为植物陪伴应用生成状态标签。只输出 JSON 字符串数组，1到2个中文短标签，每个不超过4个汉字。只能基于给定事实，不要输出读数，不要解释。"
          },
          {
            role: "user",
            content: `真实状态：\n${basis.join("\n") || "暂无状态"}`
          }
        ],
        { temperature: 0.35 }
      );
      const tags = cleanTags(result);
      if (tags.length) return { tags, usedLlm: true, basis };
    } catch {
      // Fallback below keeps the UI deterministic when the upstream LLM is unavailable.
    }
  }

  return { tags: fallbackTags(basis), usedLlm: false, basis };
};
