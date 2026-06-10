import type { InnerPatch } from "../state/stateService.js";
import { stateConfig } from "../../config/state.js";
import { sanitizeInnerPatch } from "../state/statePolicy.js";
import { sanitizeStatusTags } from "../plants/plantStatusTagPolicy.js";

const openMarker = "<inner_patch>";
const closeMarker = "</inner_patch>";
const tagsOpenMarker = "<status_tags>";
const tagsCloseMarker = "</status_tags>";
const hiddenOpenMarkers = [openMarker, tagsOpenMarker] as const;

export interface ParsedChatResponse {
  reply: string;
  innerPatch: InnerPatch;
  statusTags?: string[];
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
  if (hiddenIndex < 0) return { reply: text.trim(), innerPatch: {} };
  const patchText = extractBlock(text, openMarker, closeMarker);
  const tagsText = extractBlock(text, tagsOpenMarker, tagsCloseMarker);
  const parsedTags = tagsText === null ? undefined : parseTags(tagsText.trim());
  return {
    reply: text.slice(0, hiddenIndex).trim(),
    innerPatch: patchText === null ? {} : parsePatch(patchText.trim()),
    ...(parsedTags !== undefined ? { statusTags: parsedTags } : {})
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
