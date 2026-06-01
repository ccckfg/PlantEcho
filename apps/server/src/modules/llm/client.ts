import { env } from "../../config/env.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatOptions {
  modelId?: string;
  temperature?: number;
}

const chatUrl = (): string => {
  const base = env.LLM_API_URL.replace(/\/$/, "");
  if (!base) return "";
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
};

const effectiveModelId = (options?: LlmChatOptions): string =>
  options?.modelId?.trim() || env.LLM_MODEL_ID;

export const isLlmConfigured = (options?: LlmChatOptions): boolean => {
  return Boolean(chatUrl() && env.LLM_API_KEY && effectiveModelId(options));
};

type OpenAIChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type OpenAIStreamChunk = {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
};

export const completeChat = async (
  messages: LlmMessage[],
  options?: LlmChatOptions
): Promise<string | null> => {
  if (!isLlmConfigured(options)) return null;
  const response = await fetch(chatUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: effectiveModelId(options),
      temperature: options?.temperature ?? env.LLM_TEMPERATURE,
      messages
    })
  });
  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as OpenAIChatCompletionsResponse;
  return json.choices?.[0]?.message?.content?.trim() ?? null;
};

const parseStreamFrame = (frame: string): string[] => {
  return frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());
};

export async function* streamChat(
  messages: LlmMessage[],
  options?: LlmChatOptions
): AsyncGenerator<string> {
  if (!isLlmConfigured(options)) return;
  const response = await fetch(chatUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: effectiveModelId(options),
      temperature: options?.temperature ?? env.LLM_TEMPERATURE,
      stream: true,
      messages
    })
  });
  if (!response.ok) {
    throw new Error(`LLM stream request failed: ${response.status} ${await response.text()}`);
  }
  if (!response.body) throw new Error("LLM stream response body is empty");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const data of parseStreamFrame(frame)) {
        if (data === "[DONE]") return;
        const chunk = JSON.parse(data) as OpenAIStreamChunk;
        const delta = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
        if (delta) yield delta;
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

export const completeJson = async <T>(
  messages: LlmMessage[],
  options?: LlmChatOptions
): Promise<T | null> => {
  const text = await completeChat(messages, options);
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
};
