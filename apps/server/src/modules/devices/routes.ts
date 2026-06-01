import { claimDeviceSchema, deviceReadingSchema } from "@dyn/shared";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import { recordDeviceReading } from "../readings/readingService.js";
import {
  claimDevice,
  getClaimedDevices,
  getPendingDevices,
  ignorePendingDevice,
  isAuthorizedDevice,
  isKnownDevice,
  registerPendingDevice,
  rotateDeviceKey
} from "./deviceService.js";

const headerValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const registerDeviceRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/devices", async () => ({
    devices: getClaimedDevices()
  }));

  app.get("/api/v1/devices/pending", async () => ({
    devices: getPendingDevices()
  }));

  app.post("/api/v1/devices/:deviceId/claim", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const input = claimDeviceSchema.parse(request.body);
      return reply.status(201).send(claimDevice(deviceId, input));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/ignore", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      return reply.send({ device: ignorePendingDevice(deviceId) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/rotate-key", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      return reply.send(rotateDeviceKey(deviceId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/devices/:deviceId/readings", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const payload = deviceReadingSchema.parse(request.body);
      if (!isKnownDevice(deviceId)) {
        const pending = registerPendingDevice(deviceId, payload);
        return reply.status(202).send({
          status: "PENDING_DEVICE",
          deviceId,
          pending
        });
      }

      const apiKey = headerValue(request.headers["x-api-key"]);
      if (!isAuthorizedDevice(deviceId, apiKey)) {
        return reply.status(401).send({ error: "UNAUTHORIZED_DEVICE" });
      }

      const result = recordDeviceReading(deviceId, payload);
      return reply.status(201).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
