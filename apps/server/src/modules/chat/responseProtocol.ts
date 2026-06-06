import type { InnerPatch } from "../state/stateService.js";
import { stateConfig } from "../../config/state.js";
import { sanitizeInnerPatch } from "../state/statePolicy.js";

const openMarker = "<inner_patch>";
const closeMarker = "</inner_patch>";

export interface ParsedChatResponse {
  reply: string;
  innerPatch: InnerPatch;
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

export const parseChatResponse = (text: string): ParsedChatResponse => {
  const start = text.indexOf(openMarker);
  if (start < 0) return { reply: text.trim(), innerPatch: {} };
  const end = text.indexOf(closeMarker, start + openMarker.length);
  const patchText = end < 0
    ? text.slice(start + openMarker.length)
    : text.slice(start + openMarker.length, end);
  return {
    reply: text.slice(0, start).trim(),
    innerPatch: parsePatch(patchText.trim())
  };
};

export class VisibleReplyFilter {
  private buffer = "";
  private hidden = false;

  feed(chunk: string): string {
    if (this.hidden) return "";
    this.buffer += chunk;
    const markerIndex = this.buffer.indexOf(openMarker);
    if (markerIndex >= 0) {
      const visible = this.buffer.slice(0, markerIndex);
      this.buffer = "";
      this.hidden = true;
      return visible;
    }
    const safeLength = Math.max(0, this.buffer.length - openMarker.length + 1);
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
