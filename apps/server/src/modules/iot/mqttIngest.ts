import { deviceReadingSchema } from "@dyn/shared";
import { recordDeviceReading } from "../readings/readingService.js";
import {
  isKnownDevice,
  registerPendingDevice
} from "../devices/deviceService.js";

export interface MqttIngestResult {
  status: "pending" | "recorded";
  deviceId: string;
}

export const ingestMqttReading = (
  deviceId: string,
  payload: Buffer
): MqttIngestResult => {
  const parsedJson = JSON.parse(payload.toString("utf8")) as unknown;
  const reading = deviceReadingSchema.parse(parsedJson);
  if (!isKnownDevice(deviceId)) {
    registerPendingDevice(deviceId, reading);
    return { status: "pending", deviceId };
  }
  recordDeviceReading(deviceId, reading);
  return { status: "recorded", deviceId };
};
