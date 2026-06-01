import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import { getWeatherNow, searchWeatherLocations } from "./weatherService.js";

const locationQuerySchema = z.object({
  location: z.string().min(1).optional(),
  lang: z.string().min(2).max(10).optional()
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
  lang: z.string().min(2).max(10).optional()
});

export const registerWeatherRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/weather/now", async (request, reply) => {
    try {
      const query = locationQuerySchema.parse(request.query);
      return await getWeatherNow(query.location, query.lang);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/weather/locations", async (request, reply) => {
    try {
      const query = searchQuerySchema.parse(request.query);
      return { locations: await searchWeatherLocations(query.q, query.lang) };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
