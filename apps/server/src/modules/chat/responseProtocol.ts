import type { InnerPatch } from "../state/stateService.js";
import { stateConfig } from "../../config/state.js";
import { sanitizeInnerPatch } from "../state/statePolicy.js";
import { sanitizeStatusTags } from "../plants/plantStatusTagPolicy.js";
import { intentionConfig } from "../../config/intentions.js";
import type { CommitmentOperation, CommitmentPatch } from "../intentions/commitmentTypes.js";

const openMarker = "<inner_patch>";
const closeMarker = "</inner_patch>";
const tagsOpenMarker = "<status_tags>";
const tagsCloseMarker = "</status_tags>";
const toolsOpenMarker = "<tool_calls>";
const toolsCloseMarker = "</tool_calls>";
const commitmentOpenMarker = "<commitment_patch>";
const commitmentCloseMarker = "</commitment_patch>";
const hiddenOpenMarkers = [openMarker, tagsOpenMarker, commitmentOpenMarker, toolsOpenMarker] as const;

export interface ChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ParsedChatResponse {
  reply: string;
  innerPatch: InnerPatch;
  statusTags?: string[];
  commitmentPatch?: CommitmentPatch;
  toolCalls: ChatToolCall[];
  invalidToolCallsText?: string;
}

const parsePatch = (text: string): InnerPatch => {
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    return sanitizeInnerPatch({
      ...(typeof value.mood === "string" ? { mood: value.mood } : {}),
      ...(typeof value.concern === "string" ? { concern: value.concern } : {}),
      ...(typeof value.thought === "string" ? { thought: value.thought } : {})
    }, { mood: stateConfig.moodMaxChars, text: stateConfig.innerTextMaxChars });
  } catch {
    return {};
  }
};

const parseTags = (text: string): string[] | undefined => {
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    return sanitizeStatusTags(Array.isArray(value.tags) ? value.tags : []);
  } catch {
    return undefined;
  }
};

const parseToolCalls = (text: string): ChatToolCall[] | null => {
  try {
    const value = JSON.parse(text) as unknown;
    if (!Array.isArray(value)) return null;
    const calls = value.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const args = record.arguments;
      if (typeof record.name !== "string") return null;
      if (!args || typeof args !== "object" || Array.isArray(args)) return null;
      return {
        name: record.name.trim(),
        arguments: args as Record<string, unknown>
      };
    });
    return calls.every((item): item is ChatToolCall => item !== null) ? calls : null;
  } catch {
    return null;
  }
};

const optionalIso = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const parseCommitmentPatch = (text: string): CommitmentPatch | undefined => {
  try {
    const value = JSON.parse(text) as { operations?: unknown };
    if (!Array.isArray(value?.operations)) return undefined;
    const operations = value.operations
      .slice(0, intentionConfig.commitmentMaxOperations)
      .map((item): CommitmentOperation | null => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const action = record.action === "upsert" || record.action === "cancel"
          ? record.action
          : null;
        const topic = typeof record.topic === "string"
          ? record.topic.replace(/\s+/g, " ").trim().slice(0, intentionConfig.commitmentTopicMaxChars)
          : "";
        if (!action || !topic) return null;
        return {
          action,
          topic,
          ...(optionalIso(record.follow_up_at) ? { followUpAt: optionalIso(record.follow_up_at) } : {}),
          ...(optionalIso(record.expires_at) ? { expiresAt: optionalIso(record.expires_at) } : {})
        };
      })
      .filter((item): item is CommitmentOperation => item !== null);
    return { operations };
  } catch {
    return undefined;
  }
};

const extractBlock = (
  text: string,
  open: string,
  close: string
): string | null => {
  const start = text.indexOf(open);
  if (start < 0) return null;
  const end = text.indexOf(close, start + open.length);
  return end < 0
    ? text.slice(start + open.length)
    : text.slice(start + open.length, end);
};

const firstHiddenIndex = (text: string): number => {
  const indexes = hiddenOpenMarkers
    .map((marker) => text.indexOf(marker))
    .filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
};

export const parseChatResponse = (text: string): ParsedChatResponse => {
  const hiddenIndex = firstHiddenIndex(text);
  if (hiddenIndex < 0) return { reply: text.trim(), innerPatch: {}, toolCalls: [] };
  const patchText = extractBlock(text, openMarker, closeMarker);
  const tagsText = extractBlock(text, tagsOpenMarker, tagsCloseMarker);
  const commitmentText = extractBlock(text, commitmentOpenMarker, commitmentCloseMarker);
  const toolCallsText = extractBlock(text, toolsOpenMarker, toolsCloseMarker);
  const parsedTags = tagsText === null ? undefined : parseTags(tagsText.trim());
  const parsedCommitment = commitmentText === null
    ? undefined
    : parseCommitmentPatch(commitmentText.trim());
  const parsedToolCalls = toolCallsText === null ? [] : parseToolCalls(toolCallsText.trim());
  return {
    reply: text.slice(0, hiddenIndex).trim(),
    innerPatch: patchText === null ? {} : parsePatch(patchText.trim()),
    ...(parsedTags !== undefined ? { statusTags: parsedTags } : {}),
    ...(parsedCommitment !== undefined ? { commitmentPatch: parsedCommitment } : {}),
    toolCalls: parsedToolCalls ?? [],
    ...(toolCallsText !== null && parsedToolCalls === null
      ? { invalidToolCallsText: toolCallsText.trim() }
      : {})
  };
};

export class VisibleReplyFilter {
  private buffer = "";
  private hidden = false;

  feed(chunk: string): string {
    if (this.hidden) return "";
    this.buffer += chunk;
    const markerIndex = firstHiddenIndex(this.buffer);
    if (markerIndex >= 0) {
      const visible = this.buffer.slice(0, markerIndex);
      this.buffer = "";
      this.hidden = true;
      return visible;
    }
    const longestMarkerLength = Math.max(...hiddenOpenMarkers.map((marker) => marker.length));
    const safeLength = Math.max(0, this.buffer.length - longestMarkerLength + 1);
    const visible = this.buffer.slice(0, safeLength);
    this.buffer = this.buffer.slice(safeLength);
    return visible;
  }

  finish(): string {
    if (this.hidden) return "";
    const visible = this.buffer;
    this.buffer = "";
    return visible;
  }
}
