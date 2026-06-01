import type { MemoryCitation } from "@dyn/shared";
import type { RetrievedMemory } from "../memory/retrieval/retrievalService.js";

const directMemoryIntent = /(记得|记忆|之前|上次|刚才|说过|还记得|为什么这么说)/;
const statusOnlyIntent = /(状态|读数|湿度|光照|温度|缺水|晒|热|冷|健康|怎么样)/;
const memoryCue = /(我记得你之前说过|我记得你上次说过|我记得|我还记得|我也会参考之前|你之前|你上次|之前你|上次你|你曾经|你说过|你提到)/;

const strongRelevance = 0.72;
const intentRelevance = 0.55;

export const shouldOfferMemory = (userMessage: string, item: RetrievedMemory): boolean => {
  if (item.relevance >= strongRelevance && !statusOnlyIntent.test(userMessage)) return true;
  return directMemoryIntent.test(userMessage) && item.relevance >= intentRelevance;
};

export const memoryCitationsForPrompt = (
  userMessage: string,
  memories: RetrievedMemory[]
): MemoryCitation[] => {
  return memories
    .filter((item) => shouldOfferMemory(userMessage, item))
    .slice(0, 2)
    .map(({ memory, relevance }) => ({
      id: memory.id,
      title: memory.title,
      date: memory.date,
      relevance
    }));
};

export const citationsUsedByReply = (
  reply: string,
  offered: MemoryCitation[]
): MemoryCitation[] => {
  if (!offered.length || !memoryCue.test(reply)) return [];
  return offered.slice(0, 1);
};

export const repairUnsupportedMemoryClaim = (
  reply: string,
  offered: MemoryCitation[]
): string => {
  if (!memoryCue.test(reply) || offered.length) return reply;
  return reply.replace(memoryCue, "按你刚才说的");
};

export const formatCitationPolicy = (citations: MemoryCitation[]): string => {
  if (!citations.length) {
    return "本轮没有足够可靠的过往记忆可引用。不要说“我记得/你之前说过/上次”这类话。";
  }
  return [
    "本轮最多自然引用 1 条过往记忆；只有它直接帮助回答时才引用。",
    "不要提 memory_id，不要机械复述标题。",
    "如果引用，用“我记得你之前说过……”或“我还记得……”自然带出。",
    `可引用记忆：${citations.map((item) => `${item.title}(${item.date}, relevance=${item.relevance.toFixed(2)})`).join("；")}`
  ].join("\n");
};
