import { plantPersonas } from "../../config/careProfiles.js";
import { getPlant, getPlantPersonaId } from "../plants/plantRepository.js";
import { getPlantStatus } from "../plants/statusRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
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
import type { MemoryCitation, PlantHealthSummary, PlantStatus } from "@dyn/shared";

export interface ChatContext {
  userMessage: string;
  userPrompt: string;
  facts: string[];
  topMemoryText: string;
  retrievedMemories: RetrievedMemory[];
  offeredCitations: MemoryCitation[];
}

interface PromptStatus {
  mood: string;
  relationship: string;
  focus: string;
  lastSummary: string;
}

interface PromptParts {
  plant: string;
  careProfile: string;
  relevantUnderstandings: string;
  relevantMemories: string;
  recentHistory: string;
  status: string;
  sensorState: string;
  userMessage: string;
}

export const composePromptStatus = (
  status: PlantStatus | null,
  health: PlantHealthSummary
): PromptStatus => {
  const offlineIssue = health.issues.find((issue) => issue.code === "sensor_offline");
  if (offlineIssue) {
    return {
      mood: health.mood,
      relationship: status?.relationship ?? "刚开始熟悉主人",
      focus: offlineIssue.label,
      lastSummary: offlineIssue.detail
    };
  }

  return {
    mood: status?.mood ?? health.mood ?? "未知",
    relationship: status?.relationship ?? "刚开始熟悉主人",
    focus: status?.focus ?? health.issues[0]?.label ?? "观察环境",
    lastSummary: status?.lastSummary ?? health.facts.join("，")
  };
};

export const composeUserPrompt = (parts: PromptParts): string =>
  [
    `<plant>\n${parts.plant}\n</plant>`,
    `<care_profile>\n${parts.careProfile}\n</care_profile>`,
    `<relevant_understandings>\n${parts.relevantUnderstandings}\n</relevant_understandings>`,
    `<relevant_memories>\n${parts.relevantMemories}\n</relevant_memories>`,
    `<recent_history>\n${parts.recentHistory}\n</recent_history>`,
    `<status>\n${parts.status}\n</status>`,
    `<sensor_state>\n${parts.sensorState}\n</sensor_state>`,
    `主人新消息：${parts.userMessage}`
  ].join("\n\n---\n\n");

export const buildChatContext = async (plantId: string, userMessage: string): Promise<ChatContext> => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const personaId = getPlantPersonaId(plantId) as keyof typeof plantPersonas;
  const persona = plantPersonas[personaId] ?? plantPersonas.pothos;
  const status = getPlantStatus(plantId);
  const readingState = getPlantReadingState(plantId);
  const promptStatus = composePromptStatus(status, readingState.health);
  const historyMessages = windowedHistory(plantId);
  const queries = buildRetrievalQueries(userMessage, status, readingState.health, historyMessages);
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
    careProfile: JSON.stringify(plant.careProfile, null, 2),
    relevantUnderstandings: formatUnderstandingsForPrompt(understandings),
    relevantMemories: [
      `<memory_use_policy>\n${formatCitationPolicy(offeredCitations)}\n</memory_use_policy>`,
      formatMemoriesForPrompt(memories)
    ].join("\n\n"),
    recentHistory: history || "暂无近期对话",
    status: `mood: ${promptStatus.mood}\nrelationship: ${promptStatus.relationship}\nfocus: ${promptStatus.focus}\nlast_summary: ${promptStatus.lastSummary}`,
    sensorState: [
      readingState.health.facts.join("\n") || "暂无读数",
      readingState.health.issues.map((item) => `- ${item.label}: ${item.detail}`).join("\n")
    ]
      .filter(Boolean)
      .join("\n"),
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
