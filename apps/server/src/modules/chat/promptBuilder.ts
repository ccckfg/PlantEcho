import { plantPersonas } from "../../config/careProfiles.js";
import { getPlant, getPlantPersonaId } from "../plants/plantRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
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
import { formatCitationPolicy, memoryCitationsForPrompt } from "./memoryCitation.js";
import type { MemoryCitation } from "@dyn/shared";

export interface ChatContext {
  userMessage: string;
  userPrompt: string;
  facts: string[];
  topMemoryText: string;
  retrievedMemories: RetrievedMemory[];
  offeredCitations: MemoryCitation[];
}

interface PromptParts {
  plant: string;
  backgroundInfo: string;
  careProfile: string;
  physicalState: string;
  innerState: string;
  relationshipState: string;
  intentionState: string;
  relevantUnderstandings: string;
  relevantMemories: string;
  recentHistory: string;
  userMessage: string;
}

export const composeUserPrompt = (parts: PromptParts): string =>
  [
    `<plant>\n${parts.plant}\n</plant>`,
    `<plant_background>\n${parts.backgroundInfo}\n</plant_background>`,
    `<care_profile>\n${parts.careProfile}\n</care_profile>`,
    `<physical_state>\n${parts.physicalState}\n</physical_state>`,
    `<inner_state>\n${parts.innerState}\n</inner_state>`,
    `<relationship_state>\n${parts.relationshipState}\n</relationship_state>`,
    `<intention_state>\n${parts.intentionState}\n</intention_state>`,
    `<relevant_understandings>\n${parts.relevantUnderstandings}\n</relevant_understandings>`,
    `<relevant_memories>\n${parts.relevantMemories}\n</relevant_memories>`,
    `<recent_history>\n${parts.recentHistory}\n</recent_history>`,
    `主人新消息：${parts.userMessage}`
  ].join("\n\n---\n\n");

export const buildChatContext = async (plantId: string, userMessage: string): Promise<ChatContext> => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const personaId = getPlantPersonaId(plantId) as keyof typeof plantPersonas;
  const persona = plantPersonas[personaId] ?? plantPersonas.pothos;
  const readingState = getPlantReadingState(plantId);
  const state = getLayeredPlantState(plantId);
  const historyMessages = windowedHistory(plantId);
  const queries = buildRetrievalQueries(userMessage, {
    focus: [state.inner.concern, state.inner.thought].filter(Boolean).join(" "),
    relationship: `${state.relationship.stage} ${state.relationship.summary}`
  }, readingState.health, historyMessages);
  const memories = await retrieveMemories(plantId, queries.episode, queries.episodeBm25);
  const offeredCitations = memoryCitationsForPrompt(userMessage, memories);
  const understandings = await retrieveUnderstandings(
    plantId,
    queries.understanding,
    queries.understandingBm25
  );
  const history = renderHistory(historyMessages);

  const userPrompt = composeUserPrompt({
    plant: `name: ${plant.name}\nspecies: ${plant.species}\nlocation: ${plant.location}\nvoice: ${persona.voice}`,
    backgroundInfo: plant.backgroundInfo || "主人还没有为我写下额外的背景与性格。",
    careProfile: JSON.stringify(plant.careProfile, null, 2),
    physicalState: [
      `connection: ${state.physical.connection}`,
      `last_reading_at: ${state.physical.lastReadingAt ?? "none"}`,
      `raw_reading: ${JSON.stringify(state.physical.reading)}`,
      `care_profile: ${JSON.stringify(state.physical.careProfile)}`,
      `rule_reference: ${state.physical.facts.join("，") || "暂无当前读数"}`,
      state.physical.issues.map((item) => `- ${item.label}: ${item.detail}`).join("\n")
    ].filter(Boolean).join("\n"),
    innerState: `mood: ${state.inner.mood}\nconcern: ${state.inner.concern || "无"}\nthought: ${state.inner.thought || "无"}`,
    relationshipState: `stage: ${state.relationship.stage}\nsummary: ${state.relationship.summary}`,
    intentionState: state.intentions.length
      ? state.intentions.map((item) => `- ${item.content}（只是悬着的念头，不要求现在说）`).join("\n")
      : "无",
    relevantUnderstandings: formatUnderstandingsForPrompt(understandings),
    relevantMemories: [
      `<memory_use_policy>\n${formatCitationPolicy(offeredCitations)}\n</memory_use_policy>`,
      formatMemoriesForPrompt(memories)
    ].join("\n\n"),
    recentHistory: history || "暂无近期对话",
    userMessage
  });

  return {
    userMessage,
    userPrompt,
    facts: readingState.health.facts,
    topMemoryText: memories[0]?.memory.title ?? "",
    retrievedMemories: memories,
    offeredCitations
  };
};
