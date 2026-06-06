import { normalizeReadingPayload, type DeviceReadingPayload } from "@dyn/shared";
import { getPlant } from "../plants/plantRepository.js";
import { getDevicePlantId } from "../devices/deviceRepository.js";
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
  return { plantId, reading, health };
};

export const getPlantReadingState = (plantId: string) => {
  const plant = getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const latest = getLatestReading(plantId);
  const health = evaluateReading(plant.careProfile, latest);
  return {
    latest,
    health
  };
};

export const getPlantReadings = (plantId: string, limit?: number) => {
  return listReadings(plantId, limit);
};
