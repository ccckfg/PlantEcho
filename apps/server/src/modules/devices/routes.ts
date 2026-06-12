import {
  bulkDeviceActionSchema,
  claimDeviceSchema,
  deviceReadingSchema,
  updateDeviceSchema
} from "@dyn/shared";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import { recordDeviceReading } from "../readings/readingService.js";
import { requireCurrentUser } from "../plants/plantAccess.js";
import {
  applyBulkDeviceAction,
  claimDevice,
  deleteDevice,
  getClaimedDevices,
  getPendingDevices,
  ignorePendingDevice,
  isAuthorizedDevice,
  isKnownDevice,
  registerPendingDevice,
  rotateDeviceKey,
  setDeviceEnabled
} from "./deviceService.js";

const headerValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const registerDeviceRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/devices", async (request, reply) => {
    try {
      return { devices: await getClaimedDevices(requireCurrentUser(request)) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/devices/pending", async (request, reply) => {
    try {
      return { devices: await getPendingDevices(requireCurrentUser(request)) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/claim", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const input = claimDeviceSchema.parse(request.body);
      return reply.status(201).send(await claimDevice(deviceId, input, requireCurrentUser(request)));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/ignore", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      return reply.send({ device: await ignorePendingDevice(deviceId, requireCurrentUser(request)) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/rotate-key", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      return reply.send(await rotateDeviceKey(deviceId, requireCurrentUser(request)));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/devices/:deviceId", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const input = updateDeviceSchema.parse(request.body);
      return reply.send({ device: await setDeviceEnabled(deviceId, input.status === "active", requireCurrentUser(request)) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/v1/devices/:deviceId", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      return reply.send({ device: await deleteDevice(deviceId, requireCurrentUser(request)) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/bulk", async (request, reply) => {
    try {
      return reply.send(await applyBulkDeviceAction(bulkDeviceActionSchema.parse(request.body), requireCurrentUser(request)));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/readings", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const payload = deviceReadingSchema.parse(request.body);
      if (!await isKnownDevice(deviceId)) {
        const pending = await registerPendingDevice(deviceId, payload);
        return reply.status(202).send({
          status: "PENDING_DEVICE",
          deviceId,
          pending
        });
      }

      const apiKey = headerValue(request.headers["x-api-key"]);
      if (!await isAuthorizedDevice(deviceId, apiKey)) {
        return reply.status(401).send({ error: "UNAUTHORIZED_DEVICE" });
      }

      const result = await recordDeviceReading(deviceId, payload);
      return reply.status(201).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
