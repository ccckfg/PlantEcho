import type { PlantSummary } from "@dyn/shared";
import { completeChat, isLlmConfigured } from "../llm/client.js";
import { listEpisodeMemories } from "../memory/repositories/memoryRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
import { getPlant } from "./plantRepository.js";
import { getPlantStatus } from "./statusRepository.js";

export interface PlantReflection {
  text: string;
  usedLlm: boolean;
  basis: string[];
}

const cleanReflection = (text: string): string => {
  const firstLine = text
    .replace(/^["“「『]+|["”」』]+$/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";
  return firstLine.replace(/^[-*]\s*/, "").slice(0, 60);
};

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
  const status = getPlantStatus(plantId);
  const memories = listEpisodeMemories(plantId, 3);
  const basis = [
    status?.mood ? `心情：${status.mood}` : "",
    status?.focus ? `关注：${status.focus}` : "",
    readingState.health.facts.join("，"),
    readingState.health.issues.map((issue) => issue.label).join("，"),
    ...memories.map((memory) => `记忆：${memory.title}`)
  ].filter(Boolean);

  if (isLlmConfigured()) {
    try {
      const text = await completeChat(
        [
          {
            role: "system",
            content:
              "你为一株植物写一句简短、有哲理、有陪伴感的话。只能输出一句中文，不超过24个汉字，不要解释，不要引号，不要使用感叹号。"
          },
          {
            role: "user",
            content: [
              `植物：${plant.name}（${plant.species}）`,
              `最近状态：${basis.join("；") || "暂无状态"}`,
              "请基于这些真实状态写一句短句。"
            ].join("\n")
          }
        ],
        { temperature: 0.55 }
      );
      const cleaned = text ? cleanReflection(text) : "";
      if (cleaned) return { text: cleaned, usedLlm: true, basis };
    } catch {
      // Local fallback keeps the UI useful when the upstream LLM is unavailable.
    }
  }

  return { text: fallbackReflection(plant, basis), usedLlm: false, basis };
};
