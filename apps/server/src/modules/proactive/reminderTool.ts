import { llmPhases } from "../../config/llmRouting.js";
import { proactiveConfig } from "../../config/proactive.js";
import { completeJson } from "../llm/client.js";
import type { ChatToolCall } from "../chat/responseProtocol.js";
import { scheduleReminder } from "./reminderService.js";
import type { ProactiveReminder } from "./types.js";
import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";

type ReminderToolArgs = {
  text?: unknown;
  remind_at?: unknown;
};

interface ExecuteChatToolCallsInput {
  plantId: string;
  toolCalls: ChatToolCall[];
  invalidToolCallsText?: string;
  sourceMessageId: number | null;
  timezone?: string;
}

const createReminderToolName = "create_reminder";

const normalizeToolCalls = (value: unknown): ChatToolCall[] | null => {
  if (!Array.isArray(value)) return null;
  const calls = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const args = record.arguments;
    if (record.name !== createReminderToolName) return null;
    if (!args || typeof args !== "object" || Array.isArray(args)) return null;
    return { name: record.name, arguments: args as Record<string, unknown> };
  });
  return calls.every((item): item is ChatToolCall => item !== null) ? calls : null;
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

const shouldRepairToolCalls = (text: string): boolean =>
  /\bcreate_reminder\b|\bremind_at\b|\btext\b/i.test(text);

const repairToolCalls = async (
  rawText: string,
  now: Date,
  timezone?: string
): Promise<ChatToolCall[]> => {
  if (!shouldRepairToolCalls(rawText)) return [];
  const maxAt = new Date(now.getTime() + proactiveConfig.reminderMaxDays * 86_400_000);
  try {
    const repaired = await completeJson<unknown>(
      [
        {
          role: "system",
          content: [
            "You repair malformed tool_calls JSON.",
            "Only repair the provided tool_calls fragment; never infer new intent from outside text.",
            "Return only a JSON array. Return [] if a valid call cannot be recovered.",
            "Allowed tool:",
            `${createReminderToolName} with {"name":"create_reminder","arguments":{"text":"short reminder text","remind_at":"future ISO-8601 timestamp"}}.`,
            "Do not explain."
          ].join("\n")
        },
        {
          role: "user",
          content: [
            `now: ${now.toISOString()}`,
            `timezone: ${timezone || "Asia/Shanghai"}`,
            `max_remind_at: ${maxAt.toISOString()}`,
            "tool_calls_fragment:",
            rawText
          ].join("\n")
        }
      ],
      { temperature: 0, phase: llmPhases.chatToolRepair }
    );
    return normalizeToolCalls(repaired) ?? [];
  } catch {
    console.warn("[chat-tools] invalid tool_calls JSON could not be repaired");
    return [];
  }
};

const executeCreateReminder = async (
  plantId: string,
  args: ReminderToolArgs,
  sourceMessageId: number | null,
  now: Date
): Promise<ProactiveReminder | null> => {
  const plan = validToolReminder(args, now);
  if (!plan) {
    console.warn("[chat-tools] rejected create_reminder: invalid arguments");
    return null;
  }
  return scheduleReminder(plantId, plan.text, plan.remindAt, sourceMessageId);
};

const addReminderFailureNotice = async (plantId: string): Promise<void> => {
  const turn = await nextTurn(plantId);
  const message = await addMessage(
    plantId,
    turn,
    "system",
    "刚才那个提醒我没能记下来，能再说一次具体时间吗？"
  );
  await publishSyncEvent({
    type: "messages.changed",
    plantId,
    payload: { turn, messageId: message.id, reminderFailed: true }
  });
};

export const executeChatToolCalls = async (
  input: ExecuteChatToolCallsInput
): Promise<ProactiveReminder[]> => {
  const now = new Date();
  const repairedCalls = input.toolCalls.length
    ? []
    : await repairToolCalls(input.invalidToolCallsText ?? "", now, input.timezone);
  const calls = input.toolCalls.length ? input.toolCalls : repairedCalls;
  const reminders: ProactiveReminder[] = [];
  let attemptedReminder = shouldRepairToolCalls(input.invalidToolCallsText ?? "");

  for (const call of calls) {
    if (call.name !== createReminderToolName) {
      console.warn(`[chat-tools] unknown tool name: ${call.name}`);
      continue;
    }
    attemptedReminder = true;
    const reminder = await executeCreateReminder(
      input.plantId,
      call.arguments,
      input.sourceMessageId,
      now
    );
    if (reminder) reminders.push(reminder);
  }

  if (attemptedReminder && reminders.length === 0) {
    await addReminderFailureNotice(input.plantId);
  }

  return reminders;
};
