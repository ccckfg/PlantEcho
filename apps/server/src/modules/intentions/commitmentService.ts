import { intentionConfig } from "../../config/intentions.js";
import { sanitizeStateText } from "../state/statePolicy.js";
import { cancelMatchingReminders } from "../proactive/reminderRepository.js";
import type { CommitmentPatch } from "./commitmentTypes.js";
import {
  createIntention,
  listPendingUserIntentions,
  updateIntentionStatus
} from "./intentionRepository.js";

export interface CommitmentPatchResult {
  created: number;
  cancelledIntentions: number;
  cancelledReminders: number;
}

const normalizedTopic = (value: string): string => value
  .toLocaleLowerCase()
  .replace(/[\s，。！？、,.!?：:；;（）()"'“”‘’]/g, "")
  .replace(/^(以后|到时候|记得|再|继续)/, "")
  .slice(0, intentionConfig.commitmentTopicMaxChars);

export const commitmentTopicsMatch = (left: string, right: string): boolean => {
  const a = normalizedTopic(left);
  const b = normalizedTopic(right);
  return a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a));
};

const futureDate = (value: string | undefined, now: Date): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) || parsed <= now ? null : parsed;
};

const applyUpsert = async (
  plantId: string,
  turn: number,
  topic: string,
  followUpAt: string | undefined,
  expiresAt: string | undefined,
  now: Date
): Promise<boolean> => {
  const safeTopic = sanitizeStateText(topic, intentionConfig.commitmentTopicMaxChars);
  if (!safeTopic) return false;
  const followUp = futureDate(followUpAt, now) ??
    new Date(now.getTime() + intentionConfig.agreementQuietMs);
  const requestedExpiry = futureDate(expiresAt, now);
  const defaultExpiry = new Date(
    Math.max(now.getTime(), followUp.getTime()) +
      intentionConfig.agreementExpiryDays * intentionConfig.dayMs
  );
  await createIntention({
    plantId,
    kind: "follow_up",
    content: `以后找合适的时机接住这件事：${safeTopic}`,
    sourceType: "user",
    sourceId: String(turn),
    priority: followUpAt ? 2 : 1,
    notBefore: followUp.toISOString(),
    expiresAt: requestedExpiry && requestedExpiry > followUp
      ? requestedExpiry.toISOString()
      : defaultExpiry.toISOString()
  });
  return true;
};

const applyCancel = async (plantId: string, topic: string): Promise<{ intentions: number; reminders: number }> => {
  let intentions = 0;
  for (const intention of await listPendingUserIntentions(plantId)) {
    if (!commitmentTopicsMatch(intention.content, topic)) continue;
    await updateIntentionStatus(intention.id, "dismissed");
    intentions += 1;
  }
  const reminders = await cancelMatchingReminders(
    plantId,
    (reminderText) => commitmentTopicsMatch(reminderText, topic)
  );
  return { intentions, reminders };
};

export const applyCommitmentPatch = async (
  plantId: string,
  turn: number,
  patch: CommitmentPatch | undefined,
  now = new Date()
): Promise<CommitmentPatchResult> => {
  const result = { created: 0, cancelledIntentions: 0, cancelledReminders: 0 };
  for (const operation of patch?.operations ?? []) {
    if (operation.action === "upsert") {
      if (await applyUpsert(
        plantId,
        turn,
        operation.topic,
        operation.followUpAt,
        operation.expiresAt,
        now
      )) result.created += 1;
      continue;
    }
    const cancelled = await applyCancel(plantId, operation.topic);
    result.cancelledIntentions += cancelled.intentions;
    result.cancelledReminders += cancelled.reminders;
  }
  return result;
};
