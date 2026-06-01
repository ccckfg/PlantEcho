import { memoryConfig } from "../../../config/memory.js";
import { compact } from "../../../shared/text.js";
import { nowIso } from "../../../shared/time.js";
import { rerankDocuments } from "../../llm/rerankClient.js";
import type { EpisodeMemory, Understanding } from "../domain/types.js";
import {
  getEpisodeMemory,
  listUnderstandings,
  updateMemoryRecall
} from "../repositories/memoryRepository.js";
import { episodeBm25Candidates, understandingBm25Candidates } from "./bm25.js";
import { hybridFusion, type FusedCandidate, type FusionInput } from "./fusion.js";
import { finalMemoryScore, recencyScore } from "./scorer.js";
import { ensureVectorIndexForPlant, getVectorCandidates } from "./vectorIndex.js";

export interface RetrievedMemory {
  memory: EpisodeMemory;
  score: number;
  relevance: number;
  recency: number;
}

const rerankIfConfigured = async (
  query: string,
  candidates: FusedCandidate[]
): Promise<FusedCandidate[]> => {
  const scores = await rerankDocuments(
    query,
    candidates.map((item) => ({ id: item.id, text: item.content })),
    memoryConfig.rerankTopN
  ).catch(() => null);
  if (!scores?.length) return candidates;
  const max = Math.max(...scores.map((item) => item.score));
  const min = Math.min(...scores.map((item) => item.score));
  const normalized = new Map(
    scores.map((item) => [
      item.id,
      max > min ? (item.score - min) / (max - min) : 1
    ])
  );
  return candidates
    .filter((item) => normalized.has(item.id))
    .map((item) => ({ ...item, relevance: normalized.get(item.id)! }))
    .sort((a, b) => b.relevance - a.relevance);
};

const episodeFusionInputs = async (
  plantId: string,
  semanticQuery: string,
  bm25Query: string
): Promise<FusionInput[]> => {
  await ensureVectorIndexForPlant(plantId);
  const map = new Map<string, FusionInput>();
  const vectors = await getVectorCandidates(
    plantId,
    "episode",
    semanticQuery,
    memoryConfig.vectorCandidateLimit
  );
  for (const item of vectors) {
    const memory = getEpisodeMemory(item.targetId);
    if (!memory) continue;
    map.set(memory.id, {
      id: memory.id,
      content: [memory.title, memory.content].join("\n"),
      vectorDistance: item.distance,
      metadata: { memory }
    });
  }
  for (const item of episodeBm25Candidates(plantId, bm25Query)) {
    const existing = map.get(item.id);
    const memory = getEpisodeMemory(item.id);
    if (!memory) continue;
    map.set(item.id, {
      id: item.id,
      content: [item.title, item.content].join("\n"),
      vectorDistance: existing?.vectorDistance,
      bm25Raw: item.score,
      metadata: { memory }
    });
  }
  return [...map.values()];
};

export const retrieveMemories = async (
  plantId: string,
  semanticQuery: string,
  bm25Query: string
): Promise<RetrievedMemory[]> => {
  const fused = hybridFusion(
    await episodeFusionInputs(plantId, semanticQuery, bm25Query),
    memoryConfig.hybridSearchEnabled
  );
  const candidates = await rerankIfConfigured(semanticQuery, fused);
  const current = nowIso();
  const ranked = candidates
    .map((item) => {
      const memory = item.metadata.memory as EpisodeMemory;
      const createdRecency = recencyScore(current, memory.createdAt);
      const recalledRecency = recencyScore(current, memory.lastRecalledAt);
      const recency = createdRecency * 0.7 + recalledRecency * 0.3;
      return {
        memory,
        relevance: item.relevance,
        recency,
        score: finalMemoryScore(item.relevance, recency, memory.importance)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, memoryConfig.episodeSearchLimit);
  updateMemoryRecall(ranked.map((item) => item.memory.id), current);
  return ranked;
};

const understandingFusionInputs = async (
  plantId: string,
  semanticQuery: string,
  bm25Query: string
): Promise<FusionInput[]> => {
  await ensureVectorIndexForPlant(plantId);
  const understandings = new Map(listUnderstandings(plantId).map((item) => [item.id, item]));
  const map = new Map<string, FusionInput>();
  const vectors = await getVectorCandidates(
    plantId,
    "understanding",
    semanticQuery,
    memoryConfig.vectorCandidateLimit
  );
  for (const item of vectors) {
    const understanding = understandings.get(item.targetId);
    if (!understanding) continue;
    map.set(understanding.id, {
      id: understanding.id,
      content: [understanding.subject, understanding.content].join("\n"),
      vectorDistance: item.distance,
      metadata: { understanding }
    });
  }
  for (const item of understandingBm25Candidates(plantId, bm25Query)) {
    const existing = map.get(item.id);
    const understanding = understandings.get(item.id);
    if (!understanding) continue;
    map.set(item.id, {
      id: item.id,
      content: [item.subject, item.content].join("\n"),
      vectorDistance: existing?.vectorDistance,
      bm25Raw: item.score,
      metadata: { understanding }
    });
  }
  return [...map.values()];
};

export const retrieveUnderstandings = async (
  plantId: string,
  semanticQuery: string,
  bm25Query: string
): Promise<Understanding[]> => {
  const fused = hybridFusion(
    await understandingFusionInputs(plantId, semanticQuery, bm25Query),
    memoryConfig.hybridSearchEnabled
  );
  const reranked = await rerankIfConfigured(semanticQuery, fused);
  return reranked
    .slice(0, memoryConfig.understandingSearchLimit)
    .map((item) => item.metadata.understanding as Understanding);
};

export const formatMemoriesForPrompt = (items: RetrievedMemory[]): string => {
  if (!items.length) return "（暂无相关记忆）";
  return items
    .map(({ memory, relevance }) =>
      [
        `memory_id: ${memory.id}`,
        `date: ${memory.date} ${memory.time}`,
        `title: ${memory.title}`,
        `relevance: ${relevance.toFixed(3)}`,
        `fact: ${compact(memory.content)}`
      ].join("\n")
    )
    .join("\n\n---\n\n");
};

export const formatUnderstandingsForPrompt = (items: Understanding[]): string => {
  if (!items.length) return "（暂无稳定理解）";
  return items.map((item) => `## ${item.subject}\n${compact(item.content)}`).join("\n\n---\n\n");
};
