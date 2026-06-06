import { dialogueConfig } from "../../config/dialogue.js";
import { proactiveConfig } from "../../config/proactive.js";
import { addMessage, nextTurn, recentMessages } from "../chat/messageRepository.js";
import {
  noteIntentionConsidered,
  updateIntentionStatus
} from "../intentions/intentionRepository.js";
import { chooseIntentionForConsideration } from "../intentions/intentionService.js";
import { completeJson, isLlmConfigured } from "../llm/client.js";
import { getPlant } from "../plants/plantRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";

type IntentionDecision = {
  action?: "speak" | "keep" | "complete" | "dismiss";
  message?: string;
};

const cleanMessage = (value: string | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim().slice(0, dialogueConfig.proactiveReplyMaxChars);

export const considerOneIntention = async (plantId: string): Promise<void> => {
  if (!proactiveConfig.enabled) return;
  const intention = chooseIntentionForConsideration(plantId);
  if (!intention) return;
  if (!proactiveConfig.llmEnabled || !isLlmConfigured()) return;
  const considered = noteIntentionConsidered(intention.id);
  if (!considered) return;

  const plant = getPlant(plantId);
  const history = recentMessages(plantId, 16)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  const decision = await completeJson<IntentionDecision>([
    {
      role: "system",
      content: [
        "你正在决定一个悬着的念头是否值得现在主动说出口。",
        "念头不是任务。沉默通常比打断更自然。",
        "只在此刻确实有意义、不会重复最近对话时选择 speak。",
        "keep 表示继续留在心里；complete 表示已自然结束；dismiss 表示不再值得保留。",
        `开口最多 ${dialogueConfig.proactiveReplyMaxChars} 个字，简短、口语、允许留白。`,
        '只输出 JSON：{"action":"speak|keep|complete|dismiss","message":""}'
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `植物：${plant?.name ?? plantId}`,
        `背景与性格：${plant?.backgroundInfo || "暂无"}`,
        `悬着的念头：${intention.content}`,
        `已经考虑次数：${considered.consideredCount}`,
        `最近对话：\n${history || "暂无"}`
      ].join("\n")
    }
  ], { temperature: 0.4, phase: "proactive.intention" }).catch(() => null);

  const action = decision?.action ?? "keep";
  if (action === "complete" || action === "dismiss") {
    updateIntentionStatus(intention.id, action === "complete" ? "completed" : "dismissed");
    return;
  }
  if (action !== "speak") {
    if (considered.consideredCount >= proactiveConfig.intentionMaxConsiderations) {
      updateIntentionStatus(intention.id, "dismissed");
    }
    return;
  }
  const content = cleanMessage(decision?.message);
  if (!content) return;
  const turn = nextTurn(plantId);
  const message = addMessage(plantId, turn, "assistant", content);
  updateIntentionStatus(intention.id, "completed");
  publishSyncEvent({
    type: "messages.changed",
    plantId,
    payload: { turn, messageId: message.id, proactive: true, source: "intention" }
  });
};
