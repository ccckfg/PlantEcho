import { proactiveConfig } from "../../config/proactive.js";
import { emitProactiveMessage } from "./proactiveMessage.js";
import { observeProactiveCandidate } from "./observationRepository.js";
import type { ProactiveEventInput } from "./types.js";

export const observeSensorEvent = async (
  plantId: string,
  event: ProactiveEventInput | null
): Promise<void> => {
  const shouldConsider = observeProactiveCandidate(
    plantId,
    event?.key ?? null,
    proactiveConfig.sensorMinObservations
  );
  if (event && shouldConsider) await emitProactiveMessage(event);
};
