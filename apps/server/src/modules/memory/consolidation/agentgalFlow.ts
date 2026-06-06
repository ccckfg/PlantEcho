import { completeJson } from "../../llm/client.js";
import { EPISODE_CLOSURE_DETECTOR, EPISODE_MEMORY_GENERATOR, UNDERSTANDING_PATCH } from "./agentgalPrompts.js";
import type { RelationshipPatch } from "../../state/stateService.js";

export type EpisodeClosureBoundary = {
  end_turn: number;
  old_theme: string;
  new_theme: string;
  reason: string;
};

export type EpisodeClosureOutput = Record<string, EpisodeClosureBoundary[]>;

export type EpisodeMemoryBlock = {
  should_store?: boolean;
  date: string;
  time: string;
  location: string;
  participants: string;
  keywords: string[];
  importance: number;
  title: string;
  content: string;
};

export type UnderstandingPatchOutput = {
  add: Array<{ subject: string; keywords: string[]; content: string }>;
  update: Record<string, { subject?: string; keywords?: string[]; content?: string }>;
  relationship_patch?: RelationshipPatch;
};

export const detectClosures = async (recentHistory: string): Promise<EpisodeClosureOutput | null> => {
  return await completeJson<EpisodeClosureOutput>([
    { role: "system", content: EPISODE_CLOSURE_DETECTOR },
    { role: "user", content: recentHistory }
  ], { phase: "memory.closure" });
};

export const generateEpisodeMemory = async (payload: string): Promise<EpisodeMemoryBlock | null> => {
  return await completeJson<EpisodeMemoryBlock>([
    { role: "system", content: EPISODE_MEMORY_GENERATOR },
    { role: "user", content: payload }
  ], { phase: "memory.episode" });
};

export const patchUnderstandings = async (payload: string): Promise<UnderstandingPatchOutput | null> => {
  return await completeJson<UnderstandingPatchOutput>([
    { role: "system", content: UNDERSTANDING_PATCH },
    { role: "user", content: payload }
  ], { phase: "memory.understanding" });
};
