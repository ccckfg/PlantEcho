import { z } from "zod";

export const deviceReadingSchema = z.object({
  capturedAt: z.string().datetime({ offset: true }).optional(),
  soilRaw: z.number().int().nonnegative().nullable().optional(),
  soilPercent: z.number().min(0).max(100).nullable().optional(),
  airTempC: z.number().min(-40).max(85).nullable().optional(),
  airHumidityPercent: z.number().min(0).max(100).nullable().optional(),
  lightLux: z.number().min(0).nullable().optional(),
  rssi: z.number().int().nullable().optional(),
  batteryMv: z.number().int().positive().nullable().optional(),
  userId: z.string().trim().min(1).max(128).optional()
});

export type DeviceReadingPayload = z.infer<typeof deviceReadingSchema>;
export type NormalizedDeviceReadingPayload =
  Required<Omit<DeviceReadingPayload, "userId">> &
  Pick<DeviceReadingPayload, "userId">;

export const normalizeReadingPayload = (
  payload: DeviceReadingPayload
): NormalizedDeviceReadingPayload => ({
  capturedAt: payload.capturedAt ?? new Date().toISOString(),
  soilRaw: payload.soilRaw ?? null,
  soilPercent: payload.soilPercent ?? null,
  airTempC: payload.airTempC ?? null,
  airHumidityPercent: payload.airHumidityPercent ?? null,
  lightLux: payload.lightLux ?? null,
  rssi: payload.rssi ?? null,
  batteryMv: payload.batteryMv ?? null,
  userId: payload.userId
});
