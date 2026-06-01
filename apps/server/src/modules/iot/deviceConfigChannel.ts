import type { DeviceConfigPayload } from "./deviceConfigTypes.js";

type DeviceConfigPublisher = (deviceId: string, payload: DeviceConfigPayload) => boolean;

let publisher: DeviceConfigPublisher | null = null;

export const registerDeviceConfigPublisher = (next: DeviceConfigPublisher | null): void => {
  publisher = next;
};

export const publishDeviceConfig = (
  deviceId: string,
  payload: DeviceConfigPayload
): boolean => {
  if (!publisher) return false;
  return publisher(deviceId, payload);
};
