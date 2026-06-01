import type {
  BulkDeviceActionInput,
  ClaimDeviceInput,
  DeviceRecord,
  PendingDevice,
  UpdateDeviceInput
} from "@dyn/shared";
import { request } from "./api";

export interface DeviceClaimResult {
  device: DeviceRecord;
  deviceApiKey: string;
  deliveredToDevice?: boolean;
}

export const deviceApi = {
  listDevices: () => request<{ devices: DeviceRecord[] }>("/api/v1/devices"),
  listPendingDevices: () =>
    request<{ devices: PendingDevice[] }>("/api/v1/devices/pending"),
  claimDevice: (deviceId: string, input: ClaimDeviceInput) =>
    request<DeviceClaimResult>(`/api/v1/devices/${encodeURIComponent(deviceId)}/claim`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  ignorePendingDevice: (deviceId: string) =>
    request<{ device: PendingDevice }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/ignore`,
      { method: "POST" }
    ),
  rotateDeviceKey: (deviceId: string) =>
    request<DeviceClaimResult>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/rotate-key`,
      { method: "POST" }
    ),
  updateDevice: (deviceId: string, input: UpdateDeviceInput) =>
    request<{ device: DeviceRecord }>(`/api/v1/devices/${encodeURIComponent(deviceId)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  deleteDevice: (deviceId: string) =>
    request<{ device: DeviceRecord }>(`/api/v1/devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE"
    }),
  bulkDevices: (input: BulkDeviceActionInput) =>
    request<{ devices: DeviceRecord[]; notFound: string[] }>("/api/v1/devices/bulk", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
