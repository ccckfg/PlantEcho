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
import {
  clearDeviceConfigDelivery,
  getDeviceConfigDelivery,
  hasDeviceConfigDelivery,
  markDeviceConfigDeliveryAttempt,
  upsertDeviceConfigDelivery
} from "../iot/deviceConfigDeliveryRepository.js";
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

export const isKnownDevice = async (deviceId: string): Promise<boolean> => Boolean(await getDevice(deviceId));

export const isAuthorizedDevice = async (deviceId: string, apiKey?: string): Promise<boolean> => {
  const hash = await getDeviceAuthHash(deviceId);
  if (hash === undefined) return false;
  return matchesDeviceApiKey(hash, apiKey);
};

const buildDeviceCredentialsPayload = (
  deviceId: string,
  apiKey: string
) => ({
  type: "device.credentials" as const,
  deviceId,
  apiKey,
  issuedAt: nowIso()
});

const queueDeviceCredentials = async (
  deviceId: string,
  payload: ReturnType<typeof buildDeviceCredentialsPayload>
): Promise<boolean> => {
  await upsertDeviceConfigDelivery(deviceId, payload);
  return deliverPendingDeviceConfig(deviceId);
};

const sendDeviceCredentials = async (deviceId: string, apiKey: string): Promise<boolean> =>
  queueDeviceCredentials(deviceId, buildDeviceCredentialsPayload(deviceId, apiKey));

export const deliverPendingDeviceConfig = async (deviceId: string): Promise<boolean> => {
  const delivery = await getDeviceConfigDelivery(deviceId);
  if (!delivery) return false;
  const attempted = publishDeviceConfig(deviceId, delivery.payload);
  if (attempted) await markDeviceConfigDeliveryAttempt(deviceId);
  return attempted;
};

export const hasPendingDeviceCredentials = (deviceId: string): Promise<boolean> =>
  hasDeviceConfigDelivery(deviceId);

export const confirmDeviceCredentialsDelivered = async (deviceId: string): Promise<void> => {
  await clearDeviceConfigDelivery(deviceId);
};

const userIdentifiers = (scope: UserScope = null): string[] => {
  if (!scope) return [];
  if (typeof scope === "string") return [scope];
  return [scope.id, scope.username];
};

const resolvePayloadUserId = async (value?: string): Promise<string | null> => {
  const candidate = value?.trim();
  if (!candidate) return null;
  return (await getUserById(candidate))?.id ?? (await getUserByUsername(candidate))?.id ?? candidate;
};

export const registerPendingDevice = async (
  deviceId: string,
  payload: DeviceReadingPayload
): Promise<PendingDevice> => {
  const userId = await resolvePayloadUserId(payload.userId);
  const pending = await upsertPendingDevice(deviceId, payload, payload.rssi ?? null, userId);
  await publishSyncEvent({
    type: "devices.changed",
    payload: { action: "pending", deviceId }
  });
  return pending;
};

export const getPendingDevices = (
  user: UserScope = null
): Promise<PendingDevice[]> => listPendingDevices(userIdentifiers(user));

export const getClaimedDevices = (): Promise<DeviceRecord[]> => listDevices();

export const ignorePendingDevice = async (
  deviceId: string,
  user: UserScope = null
): Promise<PendingDevice> => {
  const identifiers = userIdentifiers(user);
  const pending = await getPendingDevice(deviceId, identifiers);
  if (!pending || pending.claimStatus !== "pending") {
    throw new Error(`Pending device ${deviceId} not found`);
  }
  await markPendingDevice(deviceId, "ignored");
  const updated = await getPendingDevice(deviceId, identifiers);
  if (!updated) throw new Error(`Pending device ${deviceId} not found`);
  await publishSyncEvent({
    type: "devices.changed",
    payload: { action: "ignored", deviceId }
  });
  return updated;
};

export const claimDevice = async (
  deviceId: string,
  input: ClaimDeviceInput,
  user: UserScope = null
): Promise<DeviceClaimResult> => {
  const pending = await getPendingDevice(deviceId, userIdentifiers(user));
  const existing = await getDevice(deviceId);
  if (!pending && !existing) throw new Error(`Pending device ${deviceId} not found`);

  const createdNewPlant = input.mode === "newPlant";
  const plant = createdNewPlant ? await createPlant(input.plant) : await getPlant(input.plantId);
  if (!plant) throw new Error(`Plant ${input.mode === "existingPlant" ? input.plantId : ""} not found`);

  const apiKey = generateDeviceApiKey();
  const device = await insertClaimedDevice(
    deviceId,
    plant.id,
    input.deviceName?.trim() || `Device ${deviceId}`,
    hashDeviceApiKey(apiKey)
  );
  if (createdNewPlant) {
    await publishSyncEvent({
      type: "plants.changed",
      plantId: plant.id,
      payload: { action: "created", plantId: plant.id, source: "device_claim" }
    });
  }
  await publishSyncEvent({
    type: "devices.changed",
    plantId: plant.id,
    payload: { action: "claimed", deviceId }
  });
  return { device, deviceApiKey: apiKey, deliveredToDevice: await sendDeviceCredentials(deviceId, apiKey) };
};

export const rotateDeviceKey = async (deviceId: string): Promise<DeviceClaimResult> => {
  const existing = await getDevice(deviceId);
  if (!existing) throw new Error(`Device ${deviceId} not found`);
  const apiKey = generateDeviceApiKey();
  const device = await updateDeviceApiKeyHash(deviceId, hashDeviceApiKey(apiKey));
  if (!device) throw new Error(`Device ${deviceId} not found`);
  await publishSyncEvent({
    type: "devices.changed",
    plantId: device.plantId,
    payload: { action: "key_rotated", deviceId }
  });
  return { device, deviceApiKey: apiKey, deliveredToDevice: await sendDeviceCredentials(deviceId, apiKey) };
};

export const setDeviceEnabled = async (deviceId: string, enabled: boolean): Promise<DeviceRecord> => {
  const existing = await getDevice(deviceId, enabled);
  if (!existing) throw new Error(`Device ${deviceId} not found`);
  const device = await updateDeviceStatus(deviceId, enabled ? "active" : "disabled");
  if (!device) throw new Error(`Device ${deviceId} not found`);
  await publishSyncEvent({
    type: "devices.changed",
    plantId: device.plantId,
    payload: { action: enabled ? "enabled" : "disabled", deviceId }
  });
  return device;
};

export const deleteDevice = async (deviceId: string): Promise<DeviceRecord> => {
  const existing = await getDevice(deviceId);
  if (!existing) throw new Error(`Device ${deviceId} not found`);
  const device = await softDeleteDevice(deviceId);
  if (!device) throw new Error(`Device ${deviceId} not found`);
  await clearDeviceConfigDelivery(deviceId);
  await publishSyncEvent({
    type: "devices.changed",
    plantId: device.plantId,
    payload: { action: "deleted", deviceId }
  });
  return device;
};

export const applyBulkDeviceAction = async (
  input: BulkDeviceActionInput
): Promise<{ devices: DeviceRecord[]; notFound: string[] }> => {
  const devices: DeviceRecord[] = [];
  const notFound: string[] = [];
  for (const deviceId of input.deviceIds) {
    try {
      const device =
        input.action === "delete"
          ? await deleteDevice(deviceId)
          : await setDeviceEnabled(deviceId, input.action === "enable");
      devices.push(device);
    } catch {
      notFound.push(deviceId);
    }
  }
  await publishSyncEvent({
    type: "devices.changed",
    payload: { action: `bulk_${input.action}`, deviceIds: input.deviceIds }
  });
  return { devices, notFound };
};
