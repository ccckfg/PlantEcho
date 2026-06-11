import { normalizeReadingPayload, type DeviceReadingPayload } from "@dyn/shared";
import { getPlant } from "../plants/plantRepository.js";
import { getDevicePlantId } from "../devices/deviceRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { getLatestReading, insertReading, listReadings } from "./readingRepository.js";
import { evaluateReading } from "./rules.js";

export const recordDeviceReading = async (deviceId: string, input: DeviceReadingPayload) => {
  const plantId = await getDevicePlantId(deviceId);
  if (!plantId) throw new Error(`Device ${deviceId} is not claimed`);
  const plant = await getPlant(plantId);
  if (!plant) throw new Error(`Plant not found for device ${deviceId}`);
  const reading = await insertReading(deviceId, plantId, normalizeReadingPayload(input));
  const health = evaluateReading(plant.careProfile, reading);
  await publishSyncEvent({
    type: "readings.changed",
    plantId,
    payload: { readingId: reading.id, deviceId }
  });
  await publishSyncEvent({
    type: "devices.changed",
    plantId,
    payload: { deviceId, lastSeenAt: reading.createdAt }
  });
  return { plantId, reading, health };
};

export const getPlantReadingState = async (plantId: string) => {
  const plant = await getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const latest = await getLatestReading(plantId);
  const health = evaluateReading(plant.careProfile, latest);
  return {
    latest,
    health
  };
};

export const getPlantReadings = (plantId: string, limit?: number) => {
  return listReadings(plantId, limit);
};
