export interface DeviceConfigPayload {
  type: "device.credentials";
  deviceId: string;
  apiKey: string;
  issuedAt: string;
}
