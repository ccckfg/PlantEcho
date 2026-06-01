import type { DeviceReadingPayload, DeviceRecord, PendingDevice } from "@dyn/shared";
import {
  appHeaders,
  baseUrl,
  expectStatus,
  jsonHeaders,
  readJson,
  smokeDefaults
} from "./smokeSupport.js";

interface DeviceClaimResult {
  device: DeviceRecord;
  deviceApiKey: string;
}

const plantId = smokeDefaults.plantId;
const deviceId = process.env.DEVICE_ID ?? `smoke-device-${Date.now()}`;

const payload: DeviceReadingPayload = {
  capturedAt: new Date().toISOString(),
  soilRaw: 2180,
  soilPercent: 52,
  airTempC: 24.2,
  airHumidityPercent: 57,
  lightLux: 920,
  rssi: -55,
  batteryMv: null
};

const deviceHeaders = (deviceApiKey?: string): Headers => {
  return jsonHeaders(deviceApiKey ? { "x-api-key": deviceApiKey } : undefined);
};

const postReading = async (apiKey?: string) => {
  const response = await fetch(`${baseUrl}/api/v1/devices/${deviceId}/readings`, {
    method: "POST",
    headers: deviceHeaders(apiKey),
    body: JSON.stringify(payload)
  });
  return {
    status: response.status,
    body: await readJson<Record<string, unknown>>(response)
  };
};

console.log(`Smoke device claim: ${deviceId} -> ${baseUrl}`);

const pendingUpload = await postReading();
expectStatus("unknown device upload becomes pending", pendingUpload.status, 202);
if (pendingUpload.body.status !== "PENDING_DEVICE") {
  throw new Error(`Unexpected pending response: ${JSON.stringify(pendingUpload.body)}`);
}

const pendingResponse = await fetch(`${baseUrl}/api/v1/devices/pending`, {
  headers: appHeaders()
});
expectStatus("list pending devices", pendingResponse.status, 200);
const pendingBody = await readJson<{ devices: PendingDevice[] }>(pendingResponse);
if (!pendingBody.devices.some((device) => device.id === deviceId)) {
  throw new Error(`Pending device ${deviceId} was not returned by the server`);
}

const claimResponse = await fetch(`${baseUrl}/api/v1/devices/${deviceId}/claim`, {
  method: "POST",
  headers: appHeaders(),
  body: JSON.stringify({
    mode: "existingPlant",
    plantId,
    deviceName: `Smoke ${deviceId}`
  })
});
expectStatus("claim pending device", claimResponse.status, 201);
const claimBody = await readJson<DeviceClaimResult>(claimResponse);
if (!claimBody.deviceApiKey.startsWith("dyn_dev_")) {
  throw new Error("Claim response did not include a generated device API key");
}

const rejectedUpload = await postReading();
expectStatus("claimed device rejects missing key", rejectedUpload.status, 401);

const acceptedUpload = await postReading(claimBody.deviceApiKey);
expectStatus("claimed device accepts generated key", acceptedUpload.status, 201);

console.log(`Device ${claimBody.device.id} claimed for plant ${claimBody.device.plantId}`);
