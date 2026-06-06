import { completeJson } from "../../llm/client.js";
import { EPISODE_CLOSURE_DETECTOR, EPISODE_MEMORY_GENERATOR, UNDERSTANDING_PATCH } from "./agentgalPrompts.js";
import { promptDataBlock } from "../../chat/promptData.js";
import {
  episodeClosureOutputSchema,
  episodeMemoryBlockSchema,
  understandingPatchOutputSchema,
  type EpisodeClosureOutput,
  type EpisodeMemoryBlock,
  type UnderstandingPatchOutput
} from "./outputSchemas.js";

export type {
  EpisodeClosureOutput,
  EpisodeMemoryBlock,
  UnderstandingPatchOutput
} from "./outputSchemas.js";

export const detectClosures = async (recentHistory: string): Promise<EpisodeClosureOutput | null> => {
  const output = await completeJson<unknown>([
    { role: "system", content: EPISODE_CLOSURE_DETECTOR },
    { role: "user", content: promptDataBlock("closure_input", recentHistory) }
  ], { phase: "memory.closure" });
  return output === null ? null : episodeClosureOutputSchema.parse(output);
};

export const generateEpisodeMemory = async (payload: string): Promise<EpisodeMemoryBlock | null> => {
  const output = await completeJson<unknown>([
    { role: "system", content: EPISODE_MEMORY_GENERATOR },
    { role: "user", content: promptDataBlock("episode_input", payload) }
  ], { phase: "memory.episode" });
  return output === null ? null : episodeMemoryBlockSchema.parse(output);
};

export const patchUnderstandings = async (payload: string): Promise<UnderstandingPatchOutput | null> => {
  const output = await completeJson<unknown>([
    { role: "system", content: UNDERSTANDING_PATCH },
    { role: "user", content: promptDataBlock("understanding_input", payload) }
  ], { phase: "memory.understanding" });
  return output === null ? null : understandingPatchOutputSchema.parse(output);
};
