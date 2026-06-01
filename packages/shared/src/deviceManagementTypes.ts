import { z } from "zod";

export const deviceStatusSchema = z.enum(["active", "disabled", "deleted"]);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export const updateDeviceSchema = z.object({
  status: z.enum(["active", "disabled"])
});

export const bulkDeviceActionSchema = z.object({
  deviceIds: z.array(z.string().trim().min(1)).min(1).max(100),
  action: z.enum(["enable", "disable", "delete"])
});

export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type BulkDeviceActionInput = z.infer<typeof bulkDeviceActionSchema>;
