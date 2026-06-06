import { env } from "../../config/env.js";
import { recordLlmUsage } from "./usageRepository.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatOptions {
  modelId?: string;
  temperature?: number;
  phase?: string;
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
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

type OpenAIStreamChunk = {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

const estimatedTokens = (text: string): number => Math.max(1, Math.ceil(Array.from(text).length / 3));
const promptText = (messages: LlmMessage[]): string => messages.map((item) => item.content).join("\n");
const logUsage = (
  messages: LlmMessage[],
  completion: string,
  options: LlmChatOptions | undefined,
  usage?: OpenAIChatCompletionsResponse["usage"]
): void => {
  recordLlmUsage({
    phase: options?.phase ?? "unspecified",
    modelId: effectiveModelId(options),
    promptTokens: usage?.prompt_tokens ?? estimatedTokens(promptText(messages)),
    completionTokens: usage?.completion_tokens ?? estimatedTokens(completion),
    tokenSource: usage?.prompt_tokens !== undefined ? "provider" : "estimated"
  });
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
  const content = json.choices?.[0]?.message?.content?.trim() ?? null;
  logUsage(messages, content ?? "", options, json.usage);
  return content;
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
  let completion = "";
  let usage: OpenAIStreamChunk["usage"];

  try {
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
          usage = chunk.usage ?? usage;
          const delta = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
          completion += delta;
          if (delta) yield delta;
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    logUsage(messages, completion, options, usage);
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
