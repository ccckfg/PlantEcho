import { memoryConfig } from "../../../config/memory.js";
import { distanceToRelevance } from "./scorer.js";

export interface FusionInput {
  id: string;
  content: string;
  vectorDistance?: number;
  bm25Raw?: number;
  metadata: Record<string, unknown>;
}

export interface FusedCandidate extends FusionInput {
  relevance: number;
  vectorRelevance: number;
  bm25Relevance: number;
}

const normalizeBm25 = (value: number | undefined, min: number, max: number): number => {
  if (value === undefined) return 0;
  if (max <= min) return 1;
  return (value - min) / (max - min);
};

export const hybridFusion = (items: FusionInput[], useHybrid: boolean): FusedCandidate[] => {
  const bm25Values = items
    .map((item) => item.bm25Raw)
    .filter((value): value is number => typeof value === "number");
  const bm25Min = bm25Values.length ? Math.min(...bm25Values) : 0;
  const bm25Max = bm25Values.length ? Math.max(...bm25Values) : 0;
  return items
    .map((item) => {
      const vectorRelevance = item.vectorDistance === undefined
        ? 0
        : distanceToRelevance(item.vectorDistance);
      const bm25Relevance = useHybrid
        ? normalizeBm25(item.bm25Raw, bm25Min, bm25Max)
        : 0;
      const relevance = useHybrid
        ? memoryConfig.vectorRelevanceWeight * vectorRelevance +
          memoryConfig.bm25RelevanceWeight * bm25Relevance
        : vectorRelevance;
      return { ...item, relevance, vectorRelevance, bm25Relevance };
    })
    .sort((a, b) => b.relevance - a.relevance);
};

