import { memoryConfig } from "../../config/memory.js";
import { getHistoryWindowStart, setHistoryWindowStart } from "../memory/repositories/memorySearchRepository.js";
import { recentMessages, type ChatMessage } from "./messageRepository.js";

const distinctTurns = (messages: ChatMessage[]): number[] => {
  return [...new Set(messages.map((message) => message.turn))].sort((a, b) => a - b);
};

export const windowedHistory = (plantId: string): ChatMessage[] => {
  const raw = recentMessages(plantId, memoryConfig.rawScanTurns * 4);
  if (!raw.length) return [];
  let startTurn = getHistoryWindowStart(plantId);
  let kept = raw.filter((message) => message.turn >= startTurn);
  if (!kept.length) {
    kept = raw;
    startTurn = raw[0]?.turn ?? 0;
  }
  const turns = distinctTurns(kept);
  if (turns.length > memoryConfig.historyHigh) {
    const keepTurns = new Set(turns.slice(-memoryConfig.historyLow));
    kept = kept.filter((message) => keepTurns.has(message.turn));
    startTurn = Math.min(...keepTurns);
  }
  setHistoryWindowStart(plantId, startTurn);
  return kept;
};

export const renderHistory = (messages: ChatMessage[]): string => {
  const lines = messages.map((message) => `${message.role}: ${message.content}`);
  let used = 0;
  const kept: string[] = [];
  for (const line of [...lines].reverse()) {
    if (kept.length && used + line.length > memoryConfig.historyCharLimit) break;
    kept.push(line);
    used += line.length;
  }
  return kept.reverse().join("\n");
};
