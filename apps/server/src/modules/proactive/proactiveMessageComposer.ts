import { proactiveConfig } from "../../config/proactive.js";
import { completeChat, isLlmConfigured } from "../llm/client.js";
import { getPlant } from "../plants/plantRepository.js";
import type { ProactiveEventInput } from "./types.js";

const MAX_MESSAGE_LENGTH = 90;

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
  return firstLine.replace(/^[-*]\s*/, "").slice(0, MAX_MESSAGE_LENGTH);
};

const canUseLlm = (): boolean =>
  proactiveConfig.llmEnabled && !isTestRuntime() && isLlmConfigured();

const renderFacts = (event: ProactiveEventInput): string => {
  const facts = event.facts?.length ? event.facts : [event.content];
  return facts.map((fact) => `- ${fact}`).join("\n");
};

export const composeProactiveMessage = async (
  event: ProactiveEventInput
): Promise<string> => {
  if (!canUseLlm()) return event.content;
  const plant = getPlant(event.plantId);
  try {
    const generated = await completeChat(
      [
        {
          role: "system",
          content: [
            "你是植物陪伴系统的主动发言润色器。",
            "规则事件已经决定了该不该说话，你只负责把事实写成植物口吻的一句话。",
            "只能使用给定事实，不能添加新读数、新建议或新原因。",
            "语气温和、简短、像植物轻声提醒主人；不要说“根据规则/系统检测”。",
            "只输出一句中文，45字以内，不要引号。"
          ].join("\n")
        },
        {
          role: "user",
          content: [
            plant ? `植物：${plant.name}（${plant.species}）` : `植物ID：${event.plantId}`,
            `事件类型：${event.type}`,
            `严重程度：${event.severity}`,
            `兜底原文：${event.content}`,
            `结构化事实：\n${renderFacts(event)}`
          ].join("\n")
        }
      ],
      { temperature: 0.45 }
    );
    return cleanGeneratedMessage(generated) || event.content;
  } catch {
    return event.content;
  }
};
