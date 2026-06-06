import type { LlmChatOptions } from "../llm/client.js";
import { isEmbeddingConfigured } from "../llm/embeddingClient.js";
import { isLlmConfigured } from "../llm/client.js";
import { ServiceError } from "../../shared/serviceError.js";

export const missingChatDependencies = (
  llmConfigured: boolean,
  embeddingConfigured: boolean
): string[] => [
  ...(!llmConfigured ? ["LLM API"] : []),
  ...(!embeddingConfigured ? ["Embedding API"] : [])
];

export const assertChatDependencies = (options?: LlmChatOptions): void => {
  const missing = missingChatDependencies(
    isLlmConfigured(options),
    isEmbeddingConfigured()
  );
  if (!missing.length) return;
  throw new ServiceError(
    `Chat unavailable: configure ${missing.join(" and ")}`,
    503,
    "CHAT_DEPENDENCIES_NOT_CONFIGURED"
  );
};
