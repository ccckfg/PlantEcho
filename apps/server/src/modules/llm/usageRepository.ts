import { env } from "../../config/env.js";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

export interface LlmUsageInput {
  phase: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  tokenSource: "provider" | "estimated";
}

export const recordLlmUsage = (input: LlmUsageInput): void => {
  const estimatedCost = (
    input.promptTokens * env.LLM_INPUT_COST_PER_MILLION +
    input.completionTokens * env.LLM_OUTPUT_COST_PER_MILLION
  ) / 1_000_000;
  getDb().prepare(
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
