import { apiUrl, buildApiHeaders } from "./api";
import type { MemoryCitation } from "@dyn/shared";

export interface ChatStreamDone {
  turn: number;
  usedLlm: boolean;
  usedMemoryIds: string[];
  memoryCitations: MemoryCitation[];
  llmError?: string;
}

interface ChatStreamHandlers {
  onDelta: (delta: string) => void;
  onDone?: (done: ChatStreamDone) => void;
}

const parseFrame = (frame: string): { event: string; data: unknown } | null => {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
  }
  if (!dataLines.length) return null;
  return { event, data: JSON.parse(dataLines.join("\n")) as unknown };
};

const dispatchFrame = (
  frame: string,
  handlers: ChatStreamHandlers
): ChatStreamDone | null => {
  const parsed = parseFrame(frame);
  if (!parsed) return null;
  if (parsed.event === "delta") {
    const data = parsed.data as { delta?: string };
    if (data.delta) handlers.onDelta(data.delta);
  }
  if (parsed.event === "done") {
    const done = parsed.data as ChatStreamDone;
    handlers.onDone?.(done);
    return done;
  }
  if (parsed.event === "error") {
    const data = parsed.data as { message?: string };
    throw new Error(data.message ?? "Stream failed");
  }
  return null;
};

export async function streamPlantChat(
  plantId: string,
  content: string,
  handlers: ChatStreamHandlers
): Promise<ChatStreamDone> {
  const res = await fetch(
    apiUrl(`/api/v1/plants/${encodeURIComponent(plantId)}/chat/stream`),
    {
      method: "POST",
      headers: buildApiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ content })
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  if (!res.body) throw new Error("Stream response body is empty");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneEvent: ChatStreamDone | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      doneEvent = dispatchFrame(buffer.slice(0, boundary), handlers) ?? doneEvent;
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
  return doneEvent ?? {
    turn: 0,
    usedLlm: false,
    usedMemoryIds: [],
    memoryCitations: [],
    llmError: "STREAM_DONE_MISSING"
  };
}
