import { normalizeReadingPayload, type DeviceReadingPayload } from "@dyn/shared";
import { getPlant } from "../plants/plantRepository.js";
import { updatePlantStatus } from "../plants/statusRepository.js";
import { scheduleDetectAndConsolidate } from "../memory/consolidation/consolidationJob.js";
import { rememberSensorIssues } from "../memory/consolidation/ruleConsolidator.js";
import { getDevicePlantId } from "../devices/deviceRepository.js";
import { buildSensorEvent } from "../proactive/sensorTriggers.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { observeSensorEvent } from "../proactive/sensorObservationService.js";
import { getLatestReading, insertReading, listReadings } from "./readingRepository.js";
import { evaluateReading } from "./rules.js";
import { getSensorTrust } from "./sensorTrust.js";

export const recordDeviceReading = (deviceId: string, input: DeviceReadingPayload) => {
  const plantId = getDevicePlantId(deviceId);
  if (!plantId) throw new Error(`Device ${deviceId} is not claimed`);
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant not found for device ${deviceId}`);
  const reading = insertReading(deviceId, plantId, normalizeReadingPayload(input));
  const health = evaluateReading(plant.careProfile, reading);
  const sensorTrust = getSensorTrust(plantId);
  updatePlantStatus(
    plantId,
    sensorTrust.trusted
      ? {
          mood: health.mood,
          focus: health.issues[0]?.label ?? "保持当前环境",
          lastSummary: health.facts.join("，")
        }
      : {
          mood: "等待真实感知",
          focus: "传感器数据暂不可信",
          lastSummary: sensorTrust.reason
        }
  );
  const rememberedIssue = sensorTrust.trusted
    ? rememberSensorIssues(plantId, 0, reading, health)
    : false;
  if (rememberedIssue) scheduleDetectAndConsolidate(plantId, plant.name, 0);
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
  void observeSensorEvent(plantId, proactiveEvent).catch((error) => {
    console.warn(`[proactive] failed to observe sensor event: ${(error as Error).message}`);
  });
  return { plantId, reading, health };
};

export const getPlantReadingState = (plantId: string) => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const latest = getLatestReading(plantId);
  const sensorTrust = getSensorTrust(plantId);
  const health = sensorTrust.trusted
    ? evaluateReading(plant.careProfile, latest)
    : {
        overall: "watch" as const,
        mood: "等待真实感知",
        issues: [],
        facts: [],
        advice: "等待主人确认传感器已经正确连接后再判断状态。"
      };
  return {
    latest,
    health,
    sensorTrust
  };
};

export const getPlantReadings = (plantId: string, limit?: number) => {
  return listReadings(plantId, limit);
};
