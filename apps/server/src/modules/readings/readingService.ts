import { normalizeReadingPayload, type DeviceReadingPayload } from "@dyn/shared";
import { getPlant } from "../plants/plantRepository.js";
import { updatePlantStatus } from "../plants/statusRepository.js";
import { scheduleDetectAndConsolidate } from "../memory/consolidation/consolidationJob.js";
import { rememberSensorIssues } from "../memory/consolidation/ruleConsolidator.js";
import { getDevicePlantId } from "../devices/deviceRepository.js";
import { emitProactiveMessage } from "../proactive/proactiveMessage.js";
import { buildSensorEvent } from "../proactive/sensorTriggers.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { getLatestReading, insertReading, listReadings } from "./readingRepository.js";
import { evaluateReading } from "./rules.js";

export const recordDeviceReading = (deviceId: string, input: DeviceReadingPayload) => {
  const plantId = getDevicePlantId(deviceId);
  if (!plantId) throw new Error(`Device ${deviceId} is not claimed`);
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant not found for device ${deviceId}`);
  const reading = insertReading(deviceId, plantId, normalizeReadingPayload(input));
  const health = evaluateReading(plant.careProfile, reading);
  updatePlantStatus(plantId, {
    mood: health.mood,
    focus: health.issues[0]?.label ?? "保持当前环境",
    lastSummary: health.facts.join("，")
  });
  rememberSensorIssues(plantId, 0, reading, health);
  scheduleDetectAndConsolidate(plantId, plant.name, 0);
  publishSyncEvent({
    type: "readings.changed",
    plantId,
    payload: { readingId: reading.id, deviceId }
  });
  publishSyncEvent({
    type: "devices.changed",
    plantId,
    payload: { deviceId, lastSeenAt: reading.createdAt }
  });
  const proactiveEvent = buildSensorEvent(plantId);
  if (proactiveEvent) {
    void emitProactiveMessage(proactiveEvent).catch((error) => {
      console.warn(`[proactive] failed to emit sensor message: ${(error as Error).message}`);
    });
  }
  return { plantId, reading, health };
};

export const getPlantReadingState = (plantId: string) => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const latest = getLatestReading(plantId);
  return {
    latest,
    health: evaluateReading(plant.careProfile, latest)
  };
};

export const getPlantReadings = (plantId: string, limit?: number) => {
  return listReadings(plantId, limit);
};
