import { dialogueConfig } from "../../config/dialogue.js";

const detailedReplyIntent =
  /(详细|展开|解释|分析|列出|列表|对比|步骤|方案|怎么做|怎么办|为什么|具体|读数|数据)/;

export const replyCharLimit = (userMessage: string): number =>
  detailedReplyIntent.test(userMessage)
    ? dialogueConfig.detailedReplyMaxChars
    : dialogueConfig.defaultReplyMaxChars;

export const limitPlantReply = (text: string, userMessage: string): string => {
  void userMessage;
  return text
    .trim()
    .replace(/^["“「『]+|["”」』]+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
};
