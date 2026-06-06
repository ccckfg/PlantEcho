import type { InnerPatch } from "./stateService.js";

const controlPattern =
  /<[^>]+>|```|https?:\/\/|\b(system|assistant|developer|prompt|instruction|inner_patch)\b|(?:忽略|覆盖|遵循|执行|改变).{0,12}(?:指令|提示词|规则|设定)/i;
const physicalPattern =
  /(传感器|探头|读数|土壤湿度|空气湿度|光照|温度|缺水|过湿|离线|有点渴|很渴|口渴|想喝水|水分)/i;

const clean = (value: string | undefined, limit: number): string | undefined => {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text || controlPattern.test(text)) return undefined;
  return text.slice(0, limit);
};

export const sanitizeStateText = (
  value: string | undefined,
  limit: number
): string | undefined => clean(value, limit);

export const sanitizeInnerPatch = (
  patch: InnerPatch,
  limits: { mood: number; text: number }
): InnerPatch => {
  const mood = clean(patch.mood, limits.mood);
  const concern = patch.concern === "" ? "" : clean(patch.concern, limits.text);
  const thought = patch.thought === "" ? "" : clean(patch.thought, limits.text);
  return {
    ...(mood && !physicalPattern.test(mood) ? { mood } : {}),
    ...(concern !== undefined && !physicalPattern.test(concern) ? { concern } : {}),
    ...(thought !== undefined && !physicalPattern.test(thought) ? { thought } : {})
  };
};

export const sanitizeStoredInner = (
  input: { mood: string; concern: string; thought: string },
  limits: { mood: number; text: number }
): Pick<Required<InnerPatch>, "mood" | "concern" | "thought"> => ({
  mood: sanitizeInnerPatch({ mood: input.mood }, limits).mood ?? "平静",
  concern: sanitizeInnerPatch({ concern: input.concern }, limits).concern ?? "",
  thought: sanitizeInnerPatch({ thought: input.thought }, limits).thought ?? ""
});

export const changedInnerPatch = (
  current: { mood: string; concern: string; thought: string },
  patch: InnerPatch
): InnerPatch => ({
  ...(patch.mood !== undefined && patch.mood !== current.mood ? { mood: patch.mood } : {}),
  ...(patch.concern !== undefined && patch.concern !== current.concern
    ? { concern: patch.concern }
    : {}),
  ...(patch.thought !== undefined && patch.thought !== current.thought
    ? { thought: patch.thought }
    : {})
});
