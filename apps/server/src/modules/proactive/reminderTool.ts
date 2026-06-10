import { llmPhases } from "../../config/llmRouting.js";
import { proactiveConfig } from "../../config/proactive.js";
import {
  completeToolCall,
  isLlmConfigured,
  type LlmTool
} from "../llm/client.js";
import { scheduleReminder } from "./reminderService.js";
import type { ProactiveReminder } from "./types.js";

type ReminderToolArgs = {
  text?: unknown;
  remind_at?: unknown;
};

const createReminderTool: LlmTool = {
  type: "function",
  function: {
    name: "create_reminder",
    description: "Create a one-time reminder only when the user explicitly asks to be reminded.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: {
          type: "string",
          description: "The short thing to remind the user about, without the time expression."
        },
        remind_at: {
          type: "string",
          description: "Future reminder time as an ISO-8601 timestamp."
        }
      },
      required: ["text", "remind_at"]
    }
  }
};

const parseArgs = (raw: string): ReminderToolArgs | null => {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as ReminderToolArgs
      : null;
  } catch {
    return null;
  }
};

const validToolReminder = (
  args: ReminderToolArgs,
  now: Date
): { text: string; remindAt: Date } | null => {
  const text = typeof args.text === "string" ? args.text.trim().slice(0, 120) : "";
  const rawRemindAt = typeof args.remind_at === "string" ? args.remind_at.trim() : "";
  const remindAt = new Date(rawRemindAt);
  if (!text || Number.isNaN(remindAt.getTime())) return null;
  if (remindAt.getTime() <= now.getTime()) return null;
  const maxAt = new Date(now.getTime() + proactiveConfig.reminderMaxDays * 86_400_000);
  if (remindAt > maxAt) return null;
  return { text, remindAt };
};

const toolReminderFromText = async (
  text: string,
  now: Date,
  timezone?: string
): Promise<{ text: string; remindAt: Date } | null> => {
  if (!isLlmConfigured({ phase: llmPhases.chatReminderTool })) return null;
  const maxAt = new Date(now.getTime() + proactiveConfig.reminderMaxDays * 86_400_000);
  const call = await completeToolCall(
    [
      {
        role: "system",
        content: [
          "你是提醒工具调度器。",
          "只有当用户明确要求提醒、叫我、记得提醒我、到时候告诉我时，才调用 create_reminder。",
          "用户只是聊天、询问状态、表达愿望或记录养护时，不要调用工具。",
          "你要理解中文和英文时间写法，例如 5min、5 minutes、5分钟、五分钟、tomorrow 8am。",
          "remind_at 必须是未来的 ISO-8601 时间，text 要去掉时间表达，只保留提醒事项。"
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `now: ${now.toISOString()}`,
          `timezone: ${timezone || "Asia/Shanghai"}`,
          `max_remind_at: ${maxAt.toISOString()}`,
          `user_message: ${text}`
        ].join("\n")
      }
    ],
    [createReminderTool],
    { temperature: 0, phase: llmPhases.chatReminderTool }
  ).catch(() => null);
  if (call?.function.name !== "create_reminder") return null;
  const args = parseArgs(call.function.arguments);
  return args ? validToolReminder(args, now) : null;
};

export const scheduleReminderFromUserMessage = async (
  plantId: string,
  text: string,
  sourceMessageId: number | null,
  timezone?: string
): Promise<ProactiveReminder | null> => {
  const toolPlan = await toolReminderFromText(text, new Date(), timezone);
  return toolPlan
    ? scheduleReminder(plantId, toolPlan.text, toolPlan.remindAt, sourceMessageId)
    : null;
};
