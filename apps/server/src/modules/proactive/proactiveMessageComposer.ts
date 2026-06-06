import { proactiveConfig } from "../../config/proactive.js";
import { dialogueConfig } from "../../config/dialogue.js";
import { recentMessages } from "../chat/messageRepository.js";
import { completeJson, isLlmConfigured } from "../llm/client.js";
import { getPlant } from "../plants/plantRepository.js";
import type { ProactiveEventInput } from "./types.js";

type ProactiveDecision = {
  speak?: boolean;
  message?: string;
};

const isTestRuntime = (): boolean =>
  process.env.NODE_ENV === "test" ||
  process.env.npm_lifecycle_event === "test" ||
  process.argv.some((arg) => arg === "--test" || /\.test\.[cm]?[jt]s$/.test(arg));

const cleanGeneratedMessage = (text: string | null): string => {
  const firstLine = (text ?? "")
    .replace(/^["“「『]+|["”」』]+$/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";
  return firstLine
    .replace(/^[-*]\s*/, "")
    .slice(0, dialogueConfig.proactiveReplyMaxChars);
};

const canUseLlm = (): boolean =>
  proactiveConfig.llmEnabled && !isTestRuntime() && isLlmConfigured();

const renderFacts = (event: ProactiveEventInput): string => {
  const facts = event.facts?.length ? event.facts : [event.content];
  return facts.map((fact) => `- ${fact}`).join("\n");
};

const localDecision = (event: ProactiveEventInput): string | null => {
  if (event.type === "reminder.due") return event.content;
  if (event.type === "weather.rain") return null;
  return event.severity === "critical" ? "身体里有一点不对劲。" : null;
};

export const composeProactiveMessage = async (
  event: ProactiveEventInput
): Promise<string | null> => {
  if (event.type === "reminder.due") return event.content;
  if (event.type === "weather.rain") return null;
  if (!canUseLlm()) return localDecision(event);
  const plant = getPlant(event.plantId);
  const history = recentMessages(event.plantId, 12)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  try {
    const decision = await completeJson<ProactiveDecision>(
      [
        {
          role: "system",
          content: [
            "你是一株有分寸的植物精灵，正在决定要不要主动开口。",
            "候选事件只是你注意到的一件事，不代表必须说话。",
            "先考虑：这是不是新的、有意义的变化；现在打断主人是否值得；最近是否已经说过相近的话。",
            "能沉默就沉默。不要因为缺水、天气或记忆出现就机械发言。",
            "尊重主人写下的植物背景与性格，让它影响你是否开口和如何开口，但不要复述设定。",
            "如果开口，只说一句短而自然的话，允许抽象和留白；不要报数，不要解释规则，不要给客服式建议。",
            `消息不超过 ${dialogueConfig.proactiveReplyMaxChars} 个字。`,
            '只输出 JSON：{"speak":true或false,"message":"开口时的一句话，沉默时为空"}'
          ].join("\n")
        },
        {
          role: "user",
          content: [
            plant ? `植物：${plant.name}（${plant.species}）` : `植物ID：${event.plantId}`,
            `植物背景与性格：${plant?.backgroundInfo || "暂无"}`,
            `事件类型：${event.type}`,
            `严重程度：${event.severity}`,
            `兜底原文：${event.content}`,
            `结构化事实：\n${renderFacts(event)}`,
            `最近对话：\n${history || "暂无"}`
          ].join("\n")
        }
      ],
      { temperature: 0.45, phase: "proactive.event" }
    );
    if (!decision?.speak) return null;
    return cleanGeneratedMessage(decision.message ?? "") || localDecision(event);
  } catch {
    return localDecision(event);
  }
};
