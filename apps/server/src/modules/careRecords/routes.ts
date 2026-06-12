import type { FastifyInstance } from "fastify";
import { createCareRecordSchema } from "@dyn/shared";
import { sendError } from "../../shared/http.js";
import { requireCurrentUser, requireOwnedPlant } from "../plants/plantAccess.js";
import { createCareRecord, getPlantCareRecords } from "./careRecordService.js";

export const registerCareRecordRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/plants/:plantId/care-records", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      await requireOwnedPlant(plantId, requireCurrentUser(request));
      const query = request.query as { limit?: string };
      const limit = query.limit ? Number(query.limit) : undefined;
      return { records: await getPlantCareRecords(plantId, limit) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/plants/:plantId/care-records", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      await requireOwnedPlant(plantId, requireCurrentUser(request));
      const input = createCareRecordSchema.parse(request.body);
      const record = await createCareRecord(plantId, input);
      return reply.status(201).send({ record });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
