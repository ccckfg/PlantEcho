import { isoDatePart, isoTimePart, nowIso } from "../../../shared/time.js";
import type { ChatMessage } from "../../chat/messageRepository.js";
import type { EpisodeMemory, MemoryDraft, Understanding } from "../domain/types.js";

export const renderHistory = (messages: ChatMessage[], plantName: string): string => {
  return messages
    .map((message) => {
      const speaker = message.role === "assistant" ? plantName : message.role;
      return `[turn=${message.turn}] ${speaker}: ${message.content}`;
    })
    .join("\n");
};

export const renderDraftEntries = (drafts: MemoryDraft[]): string => {
  return drafts.map((draft) => `[turn=${draft.turn}] ${draft.text}`).join("\n\n");
};

export const buildEpisodePayload = (
  plantName: string,
  drafts: MemoryDraft[],
  rawDialogue: string
): string => {
  const now = nowIso();
  return [
    `植物名称：${plantName}`,
    `日期：${isoDatePart(now)}`,
    `时间：${isoTimePart(now)}`,
    "",
    "记忆草稿：",
    renderDraftEntries(drafts),
    "",
    "原始对话：",
    rawDialogue || "（无对应原始对话，可能是传感器事件）"
  ].join("\n");
};

export const buildUnderstandingPayload = (
  understandings: Understanding[],
  episode: EpisodeMemory
): string => {
  const current = understandings.length
    ? understandings.map((u, index) => ({
      prompt_id: `u${index + 1}`,
      id: u.id,
      subject: u.subject,
      keywords: u.keywords,
      content: u.content
    }))
    : [];
  return [
    "当前 understandings：",
    JSON.stringify(current, null, 2),
    "",
    "新 EpisodeMemory：",
    JSON.stringify({
      id: episode.id,
      date: episode.date,
      time: episode.time,
      title: episode.title,
      content: episode.content,
      keywords: episode.keywords,
      importance: episode.importance
    }, null, 2)
  ].join("\n");
};

export const resolveUnderstandingId = (
  rawId: string,
  understandings: Understanding[]
): string | null => {
  const cleaned = rawId.trim();
  const direct = understandings.find((u) => u.id === cleaned);
  if (direct) return direct.id;
  const promptMatch = /^u(\d+)$/i.exec(cleaned);
  if (promptMatch) {
    const index = Number(promptMatch[1]) - 1;
    return understandings[index]?.id ?? null;
  }
  const prefix = understandings.filter((u) => u.id.startsWith(cleaned));
  return prefix.length === 1 ? prefix[0]!.id : null;
};

