import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { careProfileSchema, plantNameSchema, suggestCareProfileSchema } from "@dyn/shared";
import { sendError } from "../../shared/http.js";
import { suggestCareProfile } from "./careProfileService.js";
import { getPlantReflection } from "./plantReflectionService.js";
import { getPlantStatusTags } from "./plantStatusTagService.js";
import { createPlant, getPlant, listPlants, updatePlant } from "./plantRepository.js";
import { getPlantStatus } from "./statusRepository.js";
import { getPlantReadingState, getPlantReadings } from "../readings/readingService.js";
import { publishSyncEvent } from "../sync/syncBus.js";

const createPlantSchema = z.object({
  name: plantNameSchema,
  species: z.string().min(1),
  location: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  personaProfileId: z.string().optional(),
  careProfile: careProfileSchema.optional()
});

const updatePlantSchema = z.object({
  name: plantNameSchema.optional(),
  careProfile: careProfileSchema.optional(),
  avatarUrl: z.string().url().or(z.string().startsWith("/media/")).nullable().optional()
}).refine((input) => input.name !== undefined || input.careProfile !== undefined || input.avatarUrl !== undefined, {
  message: "At least one plant field must be provided"
});

export const registerPlantRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/plants", async () => ({ plants: listPlants() }));

  app.post("/api/v1/plants/care-profile/suggest", async (request, reply) => {
    try {
      const input = suggestCareProfileSchema.parse(request.body);
      return { suggestion: await suggestCareProfile(input) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/plants", async (request, reply) => {
    try {
      const input = createPlantSchema.parse(request.body);
      const plant = createPlant(input);
      publishSyncEvent({
        type: "plants.changed",
        plantId: plant.id,
        payload: { action: "created", plantId: plant.id }
      });
      return reply.status(201).send({ plant });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/plants/:plantId", async (request, reply) => {
    const { plantId } = request.params as { plantId: string };
    const plant = getPlant(plantId);
    if (!plant) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
    return { plant, status: getPlantStatus(plantId) };
  });

  app.get("/api/v1/plants/:plantId/reflection", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      if (!getPlant(plantId)) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
      return { reflection: await getPlantReflection(plantId) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/plants/:plantId/status-tags", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      if (!getPlant(plantId)) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
      return { tags: await getPlantStatusTags(plantId) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/plants/:plantId", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      const input = updatePlantSchema.parse(request.body);
      const plant = updatePlant(plantId, input);
      if (!plant) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
      publishSyncEvent({
        type: "plants.changed",
        plantId: plant.id,
        payload: { action: "updated", plantId: plant.id }
      });
      return { plant };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/plants/:plantId/readings/latest", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      return getPlantReadingState(plantId);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/plants/:plantId/readings", async (request) => {
    const { plantId } = request.params as { plantId: string };
    const query = request.query as { limit?: string };
    return { readings: getPlantReadings(plantId, Number(query.limit ?? 120)) };
  });
};
