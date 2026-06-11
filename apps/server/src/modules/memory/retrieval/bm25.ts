import { memoryConfig } from "../../../config/memory.js";
import {
  getEpisodeBm25Candidates,
  getUnderstandingBm25Candidates
} from "../repositories/memorySearchRepository.js";

export const episodeBm25Candidates = (plantId: string, query: string) => {
  if (!memoryConfig.hybridSearchEnabled) return Promise.resolve([]);
  return getEpisodeBm25Candidates(plantId, query, memoryConfig.bm25CandidateLimit);
};

export const understandingBm25Candidates = (plantId: string, query: string) => {
  if (!memoryConfig.hybridSearchEnabled) return Promise.resolve([]);
  return getUnderstandingBm25Candidates(plantId, query, memoryConfig.bm25CandidateLimit);
};
