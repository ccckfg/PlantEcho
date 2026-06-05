import { dialogueConfig } from "../../config/dialogue.js";

const detailedReplyIntent =
  /(详细|展开|解释|分析|列出|列表|对比|步骤|方案|怎么做|怎么办|为什么|具体|读数|数据)/;

export const replyCharLimit = (userMessage: string): number =>
  detailedReplyIntent.test(userMessage)
    ? dialogueConfig.detailedReplyMaxChars
    : dialogueConfig.defaultReplyMaxChars;

export const limitPlantReply = (text: string, userMessage: string): string => {
  const cleaned = text
    .trim()
    .replace(/^["“「『]+|["”」』]+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
  const chars = Array.from(cleaned);
  const limit = replyCharLimit(userMessage);
  if (chars.length <= limit) return cleaned;
  return chars.slice(0, limit).join("").trimEnd();
};
