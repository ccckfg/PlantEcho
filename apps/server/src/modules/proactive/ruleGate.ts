import { proactiveConfig } from "../../config/proactive.js";
import {
  clockMinutes,
  isMinuteInWindow,
  localTimeContext,
  type LocalTimeContext
} from "../../shared/timezone.js";
import { getPlantBudget, type PlantBudget } from "./budgetService.js";
import { getPlantPresence, type PresenceSnapshot } from "./presenceService.js";
import { getPlantOwnerTimezone } from "./timezoneRepository.js";

type RuleGateContext = {
  localTime: LocalTimeContext;
  presence: PresenceSnapshot;
  budget: PlantBudget;
};

export type RuleGateResult = RuleGateContext & (
  | { allowed: true; reason: "allowed" }
  | {
      allowed: false;
      reason: "quiet_hours" | "user_away" | "budget_exhausted";
      retryAt: string;
    }
);

const afterMs = (now: Date, delayMs: number): string =>
  new Date(now.getTime() + delayMs).toISOString();

const afterQuietHours = (now: Date, minuteOfDay: number): string => {
  const end = clockMinutes(proactiveConfig.quietEnd);
  const minutes = (end - minuteOfDay + 24 * 60) % (24 * 60) || 24 * 60;
  return afterMs(now, minutes * 60_000 + 1_000);
};

export const evaluateRuleGate = async (
  plantId: string,
  now = new Date()
): Promise<RuleGateResult> => {
  const timezone = await getPlantOwnerTimezone(plantId);
  const localTime = localTimeContext(now, timezone ?? undefined, proactiveConfig.defaultTimezone);
  const presence = await getPlantPresence(plantId, now);
  const budget = await getPlantBudget(plantId);
  if (isMinuteInWindow(
    localTime.minuteOfDay,
    proactiveConfig.quietStart,
    proactiveConfig.quietEnd
  )) {
    return {
      allowed: false,
      reason: "quiet_hours",
      retryAt: afterQuietHours(now, localTime.minuteOfDay),
      localTime,
      presence,
      budget
    };
  }
  if (presence.strength === "away") {
    return {
      allowed: false,
      reason: "user_away",
      retryAt: afterMs(now, proactiveConfig.awayRetryMs),
      localTime,
      presence,
      budget
    };
  }
  if (budget.tokens < 1) {
    return {
      allowed: false,
      reason: "budget_exhausted",
      retryAt: afterMs(now, proactiveConfig.budgetRetryMs),
      localTime,
      presence,
      budget
    };
  }
  return { allowed: true, reason: "allowed", localTime, presence, budget };
};
