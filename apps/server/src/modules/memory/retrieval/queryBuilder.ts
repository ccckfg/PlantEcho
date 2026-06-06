import { memoryConfig } from "../../../config/memory.js";
import type { ChatMessage } from "../../chat/messageRepository.js";

export interface RetrievalQueries {
  episode: string;
  episodeBm25: string;
  understanding: string;
  understandingBm25: string;
}

const clip = (text: string, limit: number): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit).trim()}...`;
};

const recentDialogue = (messages: ChatMessage[], count = 4): string => {
  return messages.slice(-count).map((message) => `${message.role}: ${message.content}`).join("\n");
};

export const buildRetrievalQueries = (
  userInput: string,
  state: { focus: string; relationship: string },
  history: ChatMessage[]
): RetrievalQueries => {
  const dialogue = recentDialogue(history);
  const focus = state.focus;
  const relationship = state.relationship;
  const episode = [dialogue, focus, userInput].filter(Boolean).join("\n");
  const episodeBm25 = [focus, dialogue, userInput].filter(Boolean).join("\n");
  const understanding = [relationship, focus, dialogue, userInput].filter(Boolean).join("\n");
  const understandingBm25 = [relationship, focus, userInput].filter(Boolean).join("\n");
  return {
    episode: clip(episode || userInput, memoryConfig.queryTextLimit),
    episodeBm25: clip(episodeBm25 || userInput, memoryConfig.bm25TextLimit),
    understanding: clip(understanding || userInput, memoryConfig.understandingTextLimit),
    understandingBm25: clip(understandingBm25 || userInput, memoryConfig.bm25TextLimit)
  };
};
