import { env } from "../../config/env.js";
import { llmTierForPhase, type LlmTier } from "../../config/llmRouting.js";
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

type LlmTarget = {
  tier: LlmTier;
  apiUrl: string;
  apiKey: string;
  modelId: string;
  temperature: number;
};

const targetFor = (options?: LlmChatOptions): LlmTarget => {
  const tier = llmTierForPhase(options?.phase);
  if (tier === "secondary") {
    return {
      tier,
      apiUrl: env.SECONDARY_LLM_API_URL || env.LLM_API_URL,
      apiKey: env.SECONDARY_LLM_API_KEY || env.LLM_API_KEY,
      modelId: env.SECONDARY_LLM_MODEL_ID,
      temperature: env.SECONDARY_LLM_TEMPERATURE
    };
  }
  return {
    tier,
    apiUrl: env.LLM_API_URL,
    apiKey: env.LLM_API_KEY,
    modelId: options?.modelId?.trim() || env.LLM_MODEL_ID,
    temperature: env.LLM_TEMPERATURE
  };
};

const chatUrl = (target: LlmTarget): string => {
  const base = target.apiUrl.replace(/\/$/, "");
  if (!base) return "";
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
};

export const isLlmConfigured = (options?: LlmChatOptions): boolean => {
  const target = targetFor(options);
  return Boolean(chatUrl(target) && target.apiKey && target.modelId);
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
  const target = targetFor(options);
  recordLlmUsage({
    phase: options?.phase ?? "unspecified",
    tier: target.tier,
    modelId: target.modelId,
    promptTokens: usage?.prompt_tokens ?? estimatedTokens(promptText(messages)),
    completionTokens: usage?.completion_tokens ?? estimatedTokens(completion),
    tokenSource: usage?.prompt_tokens !== undefined ? "provider" : "estimated"
  });
};

export const completeChat = async (
  messages: LlmMessage[],
  options?: LlmChatOptions
): Promise<string | null> => {
  const target = targetFor(options);
  if (!isLlmConfigured(options)) return null;
  const response = await fetch(chatUrl(target), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${target.apiKey}`
    },
    body: JSON.stringify({
      model: target.modelId,
      temperature: options?.temperature ?? target.temperature,
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
  const target = targetFor(options);
  if (!isLlmConfigured(options)) return;
  const response = await fetch(chatUrl(target), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${target.apiKey}`
    },
    body: JSON.stringify({
      model: target.modelId,
      temperature: options?.temperature ?? target.temperature,
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
