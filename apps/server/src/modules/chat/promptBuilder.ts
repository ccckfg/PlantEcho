import { plantPersonas } from "../../config/careProfiles.js";
import { getPlant, getPlantPersonaId } from "../plants/plantRepository.js";
import { getLayeredPlantState } from "../state/stateService.js";
import { renderHistory, windowedHistory } from "./historyWindow.js";
import {
  formatMemoriesForPrompt,
  formatUnderstandingsForPrompt,
  retrieveMemories,
  type RetrievedMemory,
  retrieveUnderstandings
} from "../memory/retrieval/retrievalService.js";
import { buildRetrievalQueries } from "../memory/retrieval/queryBuilder.js";
import { memoriesAllowedForPrompt, memoryCitationsForPrompt } from "./memoryCitation.js";
import type { MemoryCitation } from "@dyn/shared";
import { promptDataBlock } from "./promptData.js";

export interface ChatContext {
  userMessage: string;
  userPrompt: string;
  retrievedMemories: RetrievedMemory[];
  offeredCitations: MemoryCitation[];
}

interface PromptParts {
  plant: unknown;
  backgroundInfo: unknown;
  careProfile: unknown;
  physicalState: unknown;
  innerState: unknown;
  relationshipState: unknown;
  intentionState: unknown;
  memoryPolicy: unknown;
  relevantUnderstandings: string;
  relevantMemories: string;
  recentHistory: string;
  userMessage: string;
}

export const composeUserPrompt = (parts: PromptParts): string =>
  [
    promptDataBlock("plant", parts.plant),
    promptDataBlock("plant_background", parts.backgroundInfo),
    promptDataBlock("care_profile", parts.careProfile),
    promptDataBlock("physical_state", parts.physicalState),
    promptDataBlock("inner_state", parts.innerState),
    promptDataBlock("relationship_state", parts.relationshipState),
    promptDataBlock("intention_state", parts.intentionState),
    promptDataBlock("memory_policy", parts.memoryPolicy),
    promptDataBlock("relevant_understandings", parts.relevantUnderstandings),
    promptDataBlock("relevant_memories", parts.relevantMemories),
    promptDataBlock("recent_history", parts.recentHistory),
    promptDataBlock("user_message", parts.userMessage, "current-user-message")
  ].join("\n\n---\n\n");

export const buildChatContext = async (
  plantId: string,
  userMessage: string,
  currentTurn?: number
): Promise<ChatContext> => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const personaId = getPlantPersonaId(plantId) as keyof typeof plantPersonas;
  const persona = plantPersonas[personaId] ?? plantPersonas.pothos;
  const state = getLayeredPlantState(plantId);
  const historyMessages = windowedHistory(plantId, currentTurn);
  const queries = buildRetrievalQueries(userMessage, {
    focus: [state.inner.concern, state.inner.thought].filter(Boolean).join(" "),
    relationship: `${state.relationship.stage} ${state.relationship.summary}`
  }, historyMessages);
  const memories = await retrieveMemories(plantId, queries.episode, queries.episodeBm25);
  const offeredCitations = memoryCitationsForPrompt(userMessage, memories);
  const promptMemories = memoriesAllowedForPrompt(memories, offeredCitations);
  const understandings = await retrieveUnderstandings(
    plantId,
    queries.understanding,
    queries.understandingBm25
  );
  const history = renderHistory(historyMessages);

  const userPrompt = composeUserPrompt({
    plant: { name: plant.name, species: plant.species, location: plant.location, voice: persona.voice },
    backgroundInfo: plant.backgroundInfo || "主人还没有为我写下额外的背景与性格。",
    careProfile: plant.careProfile,
    physicalState: {
      connection: state.physical.connection,
      lastReadingAt: state.physical.lastReadingAt,
      rawReading: state.physical.reading,
      careProfile: state.physical.careProfile,
      ruleReferenceAdvisory: {
        facts: state.physical.facts,
        issues: state.physical.issues,
        note: "这是仅按原始读数与范围比较生成的参考；背景信息与近期对话可能说明特殊情况。"
      }
    },
    innerState: state.inner,
    relationshipState: state.relationship,
    intentionState: state.intentions.length
      ? state.intentions.map((item) => ({
          ...item,
          note: "只是悬着的念头，不要求现在说"
        }))
      : [],
    memoryPolicy: {
      mayReferencePastMemory: offeredCitations.length > 0,
      maxReferences: offeredCitations.length ? 1 : 0,
      offeredCitations
    },
    relevantUnderstandings: formatUnderstandingsForPrompt(understandings),
    relevantMemories: formatMemoriesForPrompt(promptMemories),
    recentHistory: history || "暂无近期对话",
    userMessage
  });

  return {
    userMessage,
    userPrompt,
    retrievedMemories: memories,
    offeredCitations
  };
};
