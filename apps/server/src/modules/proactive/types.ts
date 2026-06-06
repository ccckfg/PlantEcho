export type ProactiveSeverity = "info" | "warning" | "critical";

export type ProactiveEventType =
  | "weather.rain"
  | "reminder.due";

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

export type ReminderStatus = "scheduled" | "sent" | "cancelled";

export interface ProactiveReminder {
  id: string;
  plantId: string;
  sourceMessageId: number | null;
  text: string;
  remindAt: string;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderPlan {
  text: string;
  remindAt: Date;
}
