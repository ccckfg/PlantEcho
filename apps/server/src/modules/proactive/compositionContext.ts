import type { PlantIntention } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { messagesInTurnRange } from "../chat/messageRepository.js";
import {
  getEpisodeMemory,
  getUnderstanding
} from "../memory/repositories/memoryRepository.js";
import {
  formatMemoriesForPrompt,
  retrieveMemories
} from "../memory/retrieval/retrievalService.js";
import { getBodyState } from "./bodyStateRepository.js";

const sourceEvidence = async (intention: PlantIntention): Promise<unknown> => {
  if (!intention.sourceId) return null;
  if (intention.sourceType === "episode") return getEpisodeMemory(intention.sourceId);
  if (intention.sourceType === "understanding") return getUnderstanding(intention.sourceId);
  if (intention.sourceType === "sensor") {
    const metric = intention.sourceId.split(":")[1];
    return metric ? getBodyState(intention.plantId, metric) : null;
  }
  if (intention.sourceType === "temporal") {
    return { triggerId: intention.sourceId, evidence: intention.content };
  }
  const turn = Number(intention.sourceId);
  return Number.isInteger(turn)
    ? messagesInTurnRange(intention.plantId, turn, turn)
    : null;
};

const recentProactiveMessages = async (plantId: string, limit = 5): Promise<string[]> => {
  const rows = await getDb().prepare(
    `SELECT m.content
     FROM messages m
     WHERE m.plant_id = ? AND (
       EXISTS (SELECT 1 FROM proactive_decisions d WHERE d.message_id = m.id) OR
       EXISTS (SELECT 1 FROM proactive_event_log e WHERE e.message_id = m.id)
     )
     ORDER BY m.id DESC LIMIT ?`
  ).all<{ content: string }>(plantId, limit);
  return rows.map((row) => row.content);
};

export const buildCompositionContext = async (intention: PlantIntention): Promise<{
  source: unknown;
  relevantMemories: string;
  recentProactive: string[];
}> => {
  const memories = await retrieveMemories(
    intention.plantId,
    intention.content,
    intention.content
  ).catch(() => []);
  return {
    source: await sourceEvidence(intention),
    relevantMemories: formatMemoriesForPrompt(memories),
    recentProactive: await recentProactiveMessages(intention.plantId)
  };
};
