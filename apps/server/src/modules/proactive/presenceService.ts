import { proactiveConfig } from "../../config/proactive.js";
import { getPlantOwnerActivity } from "./presenceRepository.js";
import { isUserStronglyPresent } from "./presenceTracker.js";

export interface PresenceSnapshot {
  strength: "strong" | "weak" | "away";
  userId: string | null;
  lastSeenAt: string | null;
}

const isRecent = (value: string | null, now: Date): boolean =>
  Boolean(value && now.getTime() - new Date(value).getTime() <= proactiveConfig.userPresenceWindowMs);

export const getPlantPresence = async (
  plantId: string,
  now = new Date()
): Promise<PresenceSnapshot> => {
  const activity = await getPlantOwnerActivity(plantId);
  if (activity.userId && isUserStronglyPresent(activity.userId, now.getTime())) {
    return { strength: "strong", userId: activity.userId, lastSeenAt: now.toISOString() };
  }
  const lastSeenAt = [activity.sessionLastSeenAt, activity.latestUserMessageAt]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  return {
    strength: isRecent(lastSeenAt, now) ? "weak" : "away",
    userId: activity.userId,
    lastSeenAt
  };
};
