import { memoryConfig } from "../../../config/memory.js";
import { daysBetween } from "../../../shared/time.js";
import { tokenize } from "../../../shared/text.js";

export const lexicalRelevance = (query: string, text: string): number => {
  const q = tokenize(query);
  if (!q.length) return 0;
  const body = new Set(tokenize(text));
  const hits = q.filter((term) => body.has(term)).length;
  return hits / q.length;
};

export const distanceToRelevance = (distance: number): number => {
  return Math.max(0, 1 - Math.min(Number(distance), 2) / 2);
};

export const recencyScore = (currentIso: string, pastIso: string): number => {
  const days = daysBetween(currentIso, pastIso);
  return Math.exp((-Math.log(2) * days) / memoryConfig.recencyHalfLifeDays);
};

export const importanceScore = (importance: number): number => {
  return (Math.max(1, Math.min(5, importance)) - 1) / 4;
};

export const finalMemoryScore = (
  relevance: number,
  recency: number,
  importance: number
): number => {
  return (
    relevance * memoryConfig.relevanceWeight +
    recency * memoryConfig.recencyWeight +
    importanceScore(importance) * memoryConfig.importanceWeight
  );
};
