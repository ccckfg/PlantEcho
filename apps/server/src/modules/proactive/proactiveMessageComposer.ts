import type { PlantIntention } from "@dyn/shared";
import { dialogueConfig } from "../../config/dialogue.js";
import { llmPhases } from "../../config/llmRouting.js";
import { proactiveConfig } from "../../config/proactive.js";
import type { LocalTimeContext } from "../../shared/timezone.js";
import { plantPersonaFoundation } from "../chat/personaPrompt.js";
import { promptDataBlock } from "../chat/promptData.js";
import { completeJson, isLlmConfigured } from "../llm/client.js";
import { getPlant } from "../plants/plantRepository.js";
import { buildCompositionContext } from "./compositionContext.js";
import { sanitizeProactiveMessage, type SanitizedProactiveMessage } from "./messageSafety.js";
import type { PresenceSnapshot } from "./presenceService.js";
import type { ProactiveEventInput } from "./types.js";

type GeneratedMessage = { message?: string };

const isTestRuntime = (): boolean =>
  process.env.NODE_ENV === "test" ||
  process.env.npm_lifecycle_event === "test" ||
  process.argv.some((arg) => arg === "--test" || /\.test\.[cm]?[jt]s$/.test(arg));

const canUseLlm = (phase: string): boolean =>
  proactiveConfig.llmEnabled &&
  !isTestRuntime() &&
  isLlmConfigured({ phase });

const reminderText = (event: ProactiveEventInput): string =>
  typeof event.payload?.reminderText === "string"
    ? event.payload.reminderText.trim()
    : "";

const composeReminder = async (event: ProactiveEventInput): Promise<string> => {
  const fallback = sanitizeProactiveMessage(
    event.content,
    dialogueConfig.proactiveReminderReplyMaxChars
  ).text || event.content;
  if (!canUseLlm(llmPhases.proactiveEvent)) return fallback;
  const plant = await getPlant(event.plantId);
  try {
    const generated = await completeJson<GeneratedMessage>([
      {
        role: "system",
        content: [
          plantPersonaFoundation,
          "你正在传达主人明确要求的到期提醒，这条消息必须发送。",
          "用符合植物性格的一句话自然表达，但必须逐字包含 reminderText，不能遗漏、改写事实或增加新事实。",
          `不超过 ${dialogueConfig.proactiveReminderReplyMaxChars} 个字。`,
          '只输出 JSON：{"message":"提醒句"}'
        ].join("\n")
      },
      {
        role: "user",
        content: promptDataBlock("reminder_context", {
          plant: plant ? { name: plant.name, species: plant.species, backgroundInfo: plant.backgroundInfo } : null,
          reminderText: reminderText(event),
          dueAt: event.payload?.remindAt,
          lateByMs: event.payload?.lateByMs ?? 0,
          fallback
        })
      }
    ], { temperature: 0.35, phase: llmPhases.proactiveEvent });
    const cleaned = sanitizeProactiveMessage(
      generated?.message,
      dialogueConfig.proactiveReminderReplyMaxChars
    ).text;
    return cleaned && cleaned.includes(reminderText(event)) ? cleaned : fallback;
  } catch {
    return fallback;
  }
};

export const composeProactiveMessage = async (
  event: ProactiveEventInput
): Promise<string | null> => {
  if (event.type === "reminder.due") return composeReminder(event);
  const cleaned = sanitizeProactiveMessage(
    event.content,
    dialogueConfig.proactiveMilestoneReplyMaxChars
  );
  return cleaned.text || null;
};

export interface IntentionCompositionInput {
  intention: PlantIntention;
  localTime: LocalTimeContext;
  presence: PresenceSnapshot;
}

export const composeIntentionMessage = async (
  input: IntentionCompositionInput
): Promise<SanitizedProactiveMessage | null> => {
  if (!canUseLlm(llmPhases.proactiveCompose)) return null;
  const plant = await getPlant(input.intention.plantId);
  if (!plant) return null;
  const context = await buildCompositionContext(input.intention);
  const maxChars = input.intention.kind === "acknowledge_milestone"
    ? dialogueConfig.proactiveMilestoneReplyMaxChars
    : dialogueConfig.proactiveReplyMaxChars;
  try {
    const generated = await completeJson<GeneratedMessage>([
      {
        role: "system",
        content: [
          plantPersonaFoundation,
          "判官已经决定此刻值得由你先开口。你只负责写出这句话，不要重新否决。",
          "围绕具体念头与证据表达；避免重复 recentProactive；没有证据就不能声称记得。",
          "主动开口要比普通回复更轻、更短，可以留一点没说完。",
          `不超过 ${maxChars} 个字。`,
          '只输出 JSON：{"message":"一句主动消息"}'
        ].join("\n")
      },
      {
        role: "user",
        content: promptDataBlock("composition_context", {
          plant: { name: plant.name, species: plant.species, backgroundInfo: plant.backgroundInfo },
          localTime: input.localTime,
          presence: input.presence,
          intention: input.intention,
          sourceEvidence: context.source,
          relevantMemories: context.relevantMemories,
          recentProactive: context.recentProactive
        })
      }
    ], { temperature: 0.55, phase: llmPhases.proactiveCompose });
    const cleaned = sanitizeProactiveMessage(generated?.message, maxChars);
    return cleaned.text ? cleaned : null;
  } catch {
    return null;
  }
};
