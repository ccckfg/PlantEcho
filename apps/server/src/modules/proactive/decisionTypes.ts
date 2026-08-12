export type ProactiveGateResult =
  | "no_candidate"
  | "blocked"
  | "llm_failed"
  | "decided"
  | "delivery_failed"
  | "delivered";

export type ProactiveReasonCode =
  | "no_candidate"
  | "quiet_hours"
  | "user_away"
  | "budget_exhausted"
  | "invalid_intention_content"
  | "llm_disabled"
  | "llm_unconfigured"
  | "llm_request_failed"
  | "llm_invalid_decision"
  | "llm_keep"
  | "llm_complete"
  | "llm_dismiss"
  | "llm_speak"
  | "message_sanitized"
  | "message_rejected"
  | "message_delivery_failed";

export interface ProactiveDecisionInput {
  plantId: string;
  intentionId?: string | null;
  consideredAt?: string;
  gateResult: ProactiveGateResult;
  reasonCode: ProactiveReasonCode;
  reasonDetail?: string;
  llmAction?: string | null;
  llmReason?: string | null;
  llmTokens?: number | null;
  messageId?: number | null;
}
