import { statusTagConfig } from "../../config/statusTags.js";

const blockedPattern = /[<>{}`]|https?:\/\/|指令|提示词|系统|代码/i;

const cleanTag = (value: string): string | null => {
  const tag = value.trim().replace(/[，。！？、,\s]/g, "");
  if (!tag || blockedPattern.test(tag)) return null;
  const chars = Array.from(tag);
  if (chars.length < 2 || chars.length > statusTagConfig.maxTagChars) return null;
  return chars.join("");
};

export const sanitizeStatusTags = (
  tags: readonly unknown[],
  primaryLabel = ""
): string[] => {
  const seen = new Set<string>();
  const primary = primaryLabel.trim();
  const cleaned: string[] = [];
  for (const item of tags) {
    if (typeof item !== "string") continue;
    const tag = cleanTag(item);
    if (!tag || tag === primary || seen.has(tag)) continue;
    seen.add(tag);
    cleaned.push(tag);
    if (cleaned.length >= statusTagConfig.maxSecondaryTags) break;
  }
  return cleaned;
};
