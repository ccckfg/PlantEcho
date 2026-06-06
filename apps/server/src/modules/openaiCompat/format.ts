import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import type { ChatResult } from "../chat/chatService.js";
import type { OpenAiChatMessage } from "./schema.js";

const fallbackModelId = "dyn-plant-pal";

export const resolveModelId = (requested?: string): string =>
  requested?.trim() && requested.trim() !== fallbackModelId
    ? requested.trim()
    : env.LLM_MODEL_ID || requested?.trim() || fallbackModelId;

export const listCompatModels = () => {
  const ids = [...new Set([env.LLM_MODEL_ID || fallbackModelId].filter(Boolean))];
  return ids.map((id) => ({
    id,
    object: "model",
    created: 0,
    owned_by: "dyn"
  }));
};

export const createCompletionId = (): string =>
  `chatcmpl-${randomUUID().replace(/-/g, "")}`;

export const contentToText = (content: OpenAiChatMessage["content"]): string => {
  if (typeof content === "string") return content;
  if (!content) return "";
  return content
    .map((part) => part.text ?? part.input_text ?? "")
    .filter(Boolean)
    .join("\n");
};

export const lastUserText = (messages: OpenAiChatMessage[]): string | null => {
  const message = [...messages].reverse().find((item) => item.role === "user");
  const text = message ? contentToText(message.content).trim() : "";
  return text || null;
};

const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.length / 4));

export const buildUsage = (prompt: string, completion: string) => {
  const promptTokens = estimateTokens(prompt);
  const completionTokens = estimateTokens(completion);
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens
  };
};

export const buildChatCompletion = (
  input: {
    id: string;
    created: number;
    model: string;
    prompt: string;
    result: ChatResult;
    plantRoute?: {
      plantId: string;
      plantName: string;
      requestedName: string | null;
      matched: boolean;
      source: string;
    };
  }
) => ({
  id: input.id,
  object: "chat.completion",
  created: input.created,
  model: input.model,
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: input.result.reply,
        refusal: null
      },
      logprobs: null,
      finish_reason: "stop"
    }
  ],
  usage: buildUsage(input.prompt, input.result.reply),
  system_fingerprint: null,
  dyn: {
    turn: input.result.turn,
    used_llm: input.result.usedLlm,
    used_memory_ids: input.result.usedMemoryIds,
    memory_citations: input.result.memoryCitations,
    plant_route: input.plantRoute
  }
});

export const buildStreamChunk = (
  input: {
    id: string;
    created: number;
    model: string;
    delta?: Record<string, unknown>;
    finishReason?: "stop" | "length" | "content_filter" | null;
  }
) => ({
  id: input.id,
  object: "chat.completion.chunk",
  created: input.created,
  model: input.model,
  choices: [
    {
      index: 0,
      delta: input.delta ?? {},
      logprobs: null,
      finish_reason: input.finishReason ?? null
    }
  ],
  system_fingerprint: null
});

export const buildUsageChunk = (
  input: { id: string; created: number; model: string; prompt: string; completion: string }
) => ({
  id: input.id,
  object: "chat.completion.chunk",
  created: input.created,
  model: input.model,
  choices: [],
  usage: buildUsage(input.prompt, input.completion),
  system_fingerprint: null
});
