import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import { getPlant } from "../plants/plantRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { createPlantPhoto, deletePlantPhoto, listPlantPhotos, readPhotoBytes } from "./photoRepository.js";

const photoUploadSchema = z.object({
  fileName: z.string().min(1),
  dataUrl: z.string().min(32),
  caption: z.string().max(500).optional(),
  capturedAt: z.string().datetime({ offset: true }).optional()
});

export const registerPhotoRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/plants/:plantId/photos", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      if (!getPlant(plantId)) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
      return { photos: listPlantPhotos(plantId) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/api/v1/plants/:plantId/photos",
    { bodyLimit: 10 * 1024 * 1024 },
    async (request, reply) => {
      try {
        const { plantId } = request.params as { plantId: string };
        if (!getPlant(plantId)) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
        const input = photoUploadSchema.parse(request.body);
        const photo = await createPlantPhoto(plantId, input);
        publishSyncEvent({
          type: "photos.changed",
          plantId,
          payload: { action: "created", photoId: photo.id }
        });
        return reply.status(201).send({ photo });
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/media/photos/:photoId", async (request, reply) => {
    try {
      const { photoId } = request.params as { photoId: string };
      const result = await readPhotoBytes(photoId);
      if (!result) return reply.status(404).send({ error: "PHOTO_NOT_FOUND" });
      return reply
        .type(result.photo.mimeType)
        .header("cache-control", "private, max-age=3600")
        .send(result.bytes);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/v1/plants/:plantId/photos/:photoId", async (request, reply) => {
    try {
      const { plantId, photoId } = request.params as { plantId: string; photoId: string };
      if (!getPlant(plantId)) return reply.status(404).send({ error: "PLANT_NOT_FOUND" });
      const deleted = await deletePlantPhoto(plantId, photoId);
      if (!deleted) return reply.status(404).send({ error: "PHOTO_NOT_FOUND" });
      publishSyncEvent({
        type: "photos.changed",
        plantId,
        payload: { action: "deleted", photoId }
      });
      if (deleted.avatarCleared) {
        publishSyncEvent({
          type: "plants.changed",
          plantId,
          payload: { action: "avatarCleared", plantId, photoId }
        });
      }
      return { photo: deleted.photo };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
