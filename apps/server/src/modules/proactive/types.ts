export type ProactiveSeverity = "info" | "warning" | "critical";

export type ProactiveEventType =
  | "reminder.due"
  | "intention.speak";

export interface ProactiveEventInput {
  plantId: string;
  type: ProactiveEventType;
  key: string;
  severity: ProactiveSeverity;
  content: string;
  facts?: string[];
  payload?: Record<string, unknown>;
  cooldownMs: number;
}

export type ReminderStatus = "scheduled" | "processing" | "sent" | "cancelled" | "expired";

export interface ProactiveReminder {
  id: string;
  plantId: string;
  sourceMessageId: number | null;
  text: string;
  remindAt: string;
  status: ReminderStatus;
  claimToken: string | null;
  claimExpiresAt: string | null;
  messageId: number | null;
  createdAt: string;
  updatedAt: string;
}
