import { env } from "../../config/env.js";
import type { LlmTier } from "../../config/llmRouting.js";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

export interface LlmUsageInput {
  phase: string;
  tier: LlmTier;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  tokenSource: "provider" | "estimated";
}

export const recordLlmUsage = async (input: LlmUsageInput): Promise<void> => {
  const inputCost = input.tier === "secondary"
    ? env.SECONDARY_LLM_INPUT_COST_PER_MILLION
    : env.LLM_INPUT_COST_PER_MILLION;
  const outputCost = input.tier === "secondary"
    ? env.SECONDARY_LLM_OUTPUT_COST_PER_MILLION
    : env.LLM_OUTPUT_COST_PER_MILLION;
  const estimatedCost = (
    input.promptTokens * inputCost +
    input.completionTokens * outputCost
  ) / 1_000_000;
  await getDb().prepare(
    `INSERT INTO llm_usage_logs
     (phase, model_id, prompt_tokens, completion_tokens, total_tokens,
      token_source, estimated_cost, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.phase,
    input.modelId,
    input.promptTokens,
    input.completionTokens,
    input.promptTokens + input.completionTokens,
    input.tokenSource,
    estimatedCost || null,
    nowIso()
  );
};
