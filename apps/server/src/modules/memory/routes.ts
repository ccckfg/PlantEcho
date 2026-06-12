import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import { requireCurrentUser, requireOwnedPlant } from "../plants/plantAccess.js";
import { withMilestoneMark } from "./domain/milestone.js";
import { listEpisodeMemories, listUnderstandings } from "./repositories/memoryRepository.js";

export const registerMemoryRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/plants/:plantId/memories", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      await requireOwnedPlant(plantId, requireCurrentUser(request));
      return { memories: (await listEpisodeMemories(plantId, 100)).map(withMilestoneMark) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/plants/:plantId/understandings", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      await requireOwnedPlant(plantId, requireCurrentUser(request));
      return { understandings: await listUnderstandings(plantId) };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
