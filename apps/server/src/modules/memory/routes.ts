import type { FastifyInstance } from "fastify";
import { withMilestoneMark } from "./domain/milestone.js";
import { listEpisodeMemories, listUnderstandings } from "./repositories/memoryRepository.js";

export const registerMemoryRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/plants/:plantId/memories", async (request) => {
    const { plantId } = request.params as { plantId: string };
    return { memories: (await listEpisodeMemories(plantId, 100)).map(withMilestoneMark) };
  });

  app.get("/api/v1/plants/:plantId/understandings", async (request) => {
    const { plantId } = request.params as { plantId: string };
    return { understandings: await listUnderstandings(plantId) };
  });
};
