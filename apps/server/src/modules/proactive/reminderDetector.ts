import { proactiveConfig } from "../../config/proactive.js";
import type { ReminderPlan } from "./types.js";

const cnDigits: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10
};

const parseNumber = (raw: string): number => {
  if (/^\d+$/.test(raw)) return Number(raw);
  if (raw === "十") return 10;
  if (raw.startsWith("十")) return 10 + (cnDigits[raw.at(-1) ?? ""] ?? 0);
  if (raw.endsWith("十")) return (cnDigits[raw[0]] ?? 0) * 10;
  if (raw.includes("十")) {
    const [tens, ones] = raw.split("十");
    return (cnDigits[tens] ?? 1) * 10 + (cnDigits[ones] ?? 0);
  }
  return cnDigits[raw] ?? Number.NaN;
};

const setClock = (date: Date, hour: number, minute: number): Date => {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
};

const parseRelative = (text: string, now: Date): Date | null => {
  const match = text.match(/([0-9一二两三四五六七八九十]+)\s*(分钟|小时|天)后/);
  if (!match) return null;
  const amount = parseNumber(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const ms = match[2] === "分钟" ? amount * 60_000 : match[2] === "小时" ? amount * 3_600_000 : amount * 86_400_000;
  return new Date(now.getTime() + ms);
};

const parseDayClock = (text: string, now: Date): Date | null => {
  const match = text.match(/(今天|明天|后天)?\s*(早上|上午|中午|下午|晚上)?\s*([0-9一二两三四五六七八九十]{1,3})(?:点|:)([0-9]{1,2}|半)?/);
  if (!match) return null;
  const dayWord = match[1] ?? "今天";
  const period = match[2] ?? "";
  let hour = parseNumber(match[3]);
  let minute = match[4] === "半" ? 30 : Number(match[4] ?? 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if ((period === "下午" || period === "晚上") && hour < 12) hour += 12;
  if (period === "中午" && hour < 11) hour += 12;
  const base = new Date(now);
  const offset = dayWord === "明天" ? 1 : dayWord === "后天" ? 2 : 0;
  base.setDate(base.getDate() + offset);
  const due = setClock(base, hour, minute);
  return due > now ? due : null;
};

const extractReminderText = (text: string): string => {
  const marker = text.match(/(?:提醒我|叫我|记得提醒我|帮我提醒)\s*(.+)$/);
  const raw = marker?.[1] ?? text;
  return raw
    .replace(/([0-9一二两三四五六七八九十]+)\s*(分钟|小时|天)后/g, "")
    .replace(/(今天|明天|后天)?\s*(早上|上午|中午|下午|晚上)?\s*[0-9一二两三四五六七八九十]{1,3}(?:点|:)([0-9]{1,2}|半)?/g, "")
    .replace(/[，。,.\s]*(的时候)?再?提醒我/g, "")
    .trim();
};

export const detectReminderPlan = (
  text: string,
  now = new Date()
): ReminderPlan | null => {
  if (!/(提醒我|叫我|记得提醒我|帮我提醒)/.test(text)) return null;
  const remindAt = parseRelative(text, now) ?? parseDayClock(text, now);
  if (!remindAt) return null;
  const maxAt = new Date(now.getTime() + proactiveConfig.reminderMaxDays * 86_400_000);
  if (remindAt > maxAt) return null;
  const reminderText = extractReminderText(text) || "你设置的提醒";
  return { text: reminderText, remindAt };
};
