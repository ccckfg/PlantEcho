import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import type { ProactiveDecisionInput, ProactiveGateResult, ProactiveReasonCode } from "./decisionTypes.js";

const cleanReason = (value: string | undefined | null): string =>
  (value ?? "").replace(/\s+/g, " ").trim().slice(0, 160);

export const logProactiveDecision = async (
  input: ProactiveDecisionInput
): Promise<number> => {
  const result = await getDb().prepare(
    `INSERT INTO proactive_decisions
     (plant_id, intention_id, considered_at, gate_result, reason_code, reason_detail,
      llm_action, llm_reason, llm_tokens, message_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).run(
    input.plantId,
    input.intentionId ?? null,
    input.consideredAt ?? nowIso(),
    input.gateResult,
    input.reasonCode,
    cleanReason(input.reasonDetail),
    input.llmAction ?? null,
    cleanReason(input.llmReason) || null,
    input.llmTokens ?? null,
    input.messageId ?? null
  );
  return Number(result.lastInsertRowid);
};

export const updateProactiveDecision = async (
  id: number,
  input: {
    gateResult: ProactiveGateResult;
    reasonCode: ProactiveReasonCode;
    reasonDetail?: string;
    messageId?: number | null;
  }
): Promise<void> => {
  await getDb().prepare(
    `UPDATE proactive_decisions
     SET gate_result = ?, reason_code = ?, reason_detail = ?, message_id = COALESCE(?, message_id)
     WHERE id = ?`
  ).run(
    input.gateResult,
    input.reasonCode,
    cleanReason(input.reasonDetail),
    input.messageId ?? null,
    id
  );
};
