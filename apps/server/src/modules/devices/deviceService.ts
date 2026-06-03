import type {
  AppUser,
  BulkDeviceActionInput,
  ClaimDeviceInput,
  DeviceReadingPayload,
  DeviceRecord,
  PendingDevice
} from "@dyn/shared";
import { getPlant, createPlant } from "../plants/plantRepository.js";
import { nowIso } from "../../shared/time.js";
import { getUserById, getUserByUsername } from "../auth/authRepository.js";
import { publishDeviceConfig } from "../iot/deviceConfigChannel.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import {
  getDevice,
  getDeviceAuthHash,
  getPendingDevice,
  insertClaimedDevice,
  listDevices,
  listPendingDevices,
  markPendingDevice,
  softDeleteDevice,
  updateDeviceApiKeyHash,
  updateDeviceStatus,
  upsertPendingDevice
} from "./deviceRepository.js";
import {
  generateDeviceApiKey,
  hashDeviceApiKey,
  matchesDeviceApiKey
} from "./deviceAuth.js";

export interface DeviceClaimResult {
  device: DeviceRecord;
  deviceApiKey: string;
  deliveredToDevice: boolean;
}

type UserScope = Pick<AppUser, "id" | "username"> | string | null;

export const isKnownDevice = (deviceId: string): boolean => Boolean(getDevice(deviceId));

export const isAuthorizedDevice = (deviceId: string, apiKey?: string): boolean => {
  const hash = getDeviceAuthHash(deviceId);
  if (hash === undefined) return false;
  return matchesDeviceApiKey(hash, apiKey);
};

const sendDeviceCredentials = (deviceId: string, apiKey: string): boolean =>
  publishDeviceConfig(deviceId, {
    type: "device.credentials",
    deviceId,
    apiKey,
    issuedAt: nowIso()
  });

const userIdentifiers = (scope: UserScope = null): string[] => {
  if (!scope) return [];
  if (typeof scope === "string") return [scope];
  return [scope.id, scope.username];
};

const resolvePayloadUserId = (value?: string): string | null => {
  const candidate = value?.trim();
  if (!candidate) return null;
  return getUserById(candidate)?.id ?? getUserByUsername(candidate)?.id ?? candidate;
};

export const registerPendingDevice = (
  deviceId: string,
  payload: DeviceReadingPayload
): PendingDevice => {
  const userId = resolvePayloadUserId(payload.userId);
  const pending = upsertPendingDevice(deviceId, payload, payload.rssi ?? null, userId);
  publishSyncEvent({
    type: "devices.changed",
    payload: { action: "pending", deviceId }
  });
  return pending;
};

export const getPendingDevices = (
  user: UserScope = null
): PendingDevice[] => listPendingDevices(userIdentifiers(user));

export const getClaimedDevices = (): DeviceRecord[] => listDevices();

export const ignorePendingDevice = (
  deviceId: string,
  user: UserScope = null
): PendingDevice => {
  const identifiers = userIdentifiers(user);
  const pending = getPendingDevice(deviceId, identifiers);
  if (!pending || pending.claimStatus !== "pending") {
    throw new Error(`Pending device ${deviceId} not found`);
  }
  markPendingDevice(deviceId, "ignored");
  const updated = getPendingDevice(deviceId, identifiers);
  if (!updated) throw new Error(`Pending device ${deviceId} not found`);
  publishSyncEvent({
    type: "devices.changed",
    payload: { action: "ignored", deviceId }
  });
  return updated;
};

export const claimDevice = (
  deviceId: string,
  input: ClaimDeviceInput,
  user: UserScope = null
): DeviceClaimResult => {
  const pending = getPendingDevice(deviceId, userIdentifiers(user));
  const existing = getDevice(deviceId);
  if (!pending && !existing) throw new Error(`Pending device ${deviceId} not found`);

  const createdNewPlant = input.mode === "newPlant";
  const plant = createdNewPlant ? createPlant(input.plant) : getPlant(input.plantId);
  if (!plant) throw new Error(`Plant ${input.mode === "existingPlant" ? input.plantId : ""} not found`);

  const apiKey = generateDeviceApiKey();
  const device = insertClaimedDevice(
    deviceId,
    plant.id,
    input.deviceName?.trim() || `Device ${deviceId}`,
    hashDeviceApiKey(apiKey)
  );
  if (createdNewPlant) {
    publishSyncEvent({
      type: "plants.changed",
      plantId: plant.id,
      payload: { action: "created", plantId: plant.id, source: "device_claim" }
    });
  }
  publishSyncEvent({
    type: "devices.changed",
    plantId: plant.id,
    payload: { action: "claimed", deviceId }
  });
  return { device, deviceApiKey: apiKey, deliveredToDevice: sendDeviceCredentials(deviceId, apiKey) };
};

export const rotateDeviceKey = (deviceId: string): DeviceClaimResult => {
  const existing = getDevice(deviceId);
  if (!existing) throw new Error(`Device ${deviceId} not found`);
  const apiKey = generateDeviceApiKey();
  const device = updateDeviceApiKeyHash(deviceId, hashDeviceApiKey(apiKey));
  if (!device) throw new Error(`Device ${deviceId} not found`);
  publishSyncEvent({
    type: "devices.changed",
    plantId: device.plantId,
    payload: { action: "key_rotated", deviceId }
  });
  return { device, deviceApiKey: apiKey, deliveredToDevice: sendDeviceCredentials(deviceId, apiKey) };
};

export const setDeviceEnabled = (deviceId: string, enabled: boolean): DeviceRecord => {
  const existing = getDevice(deviceId, enabled);
  if (!existing) throw new Error(`Device ${deviceId} not found`);
  const device = updateDeviceStatus(deviceId, enabled ? "active" : "disabled");
  if (!device) throw new Error(`Device ${deviceId} not found`);
  publishSyncEvent({
    type: "devices.changed",
    plantId: device.plantId,
    payload: { action: enabled ? "enabled" : "disabled", deviceId }
  });
  return device;
};

export const deleteDevice = (deviceId: string): DeviceRecord => {
  const existing = getDevice(deviceId);
  if (!existing) throw new Error(`Device ${deviceId} not found`);
  const device = softDeleteDevice(deviceId);
  if (!device) throw new Error(`Device ${deviceId} not found`);
  publishSyncEvent({
    type: "devices.changed",
    plantId: device.plantId,
    payload: { action: "deleted", deviceId }
  });
  return device;
};

export const applyBulkDeviceAction = (
  input: BulkDeviceActionInput
): { devices: DeviceRecord[]; notFound: string[] } => {
  const devices: DeviceRecord[] = [];
  const notFound: string[] = [];
  for (const deviceId of input.deviceIds) {
    try {
      const device =
        input.action === "delete"
          ? deleteDevice(deviceId)
          : setDeviceEnabled(deviceId, input.action === "enable");
      devices.push(device);
    } catch {
      notFound.push(deviceId);
    }
  }
  publishSyncEvent({
    type: "devices.changed",
    payload: { action: `bulk_${input.action}`, deviceIds: input.deviceIds }
  });
  return { devices, notFound };
};
