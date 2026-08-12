import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { proactiveConfig } from "../../config/proactive.js";
import { requireCurrentUser } from "../plants/plantAccess.js";
import {
  getUserTalkativeness,
  setUserTalkativeness,
  type Talkativeness
} from "./budgetRepository.js";
import { noteUserVisibility } from "./presenceTracker.js";

const settingsSchema = z.object({
  talkativeness: z.enum(["quiet", "moderate", "active"])
});
const presenceSchema = z.object({ visible: z.boolean() });

const responseFor = async (userId: string) => {
  const talkativeness = await getUserTalkativeness(userId) ?? proactiveConfig.defaultTalkativeness;
  return {
    talkativeness,
    dailyCapacity: proactiveConfig.budgetCapacity[talkativeness]
  };
};

export const registerProactiveRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/v1/proactive/presence", async (request) => {
    const user = requireCurrentUser(request);
    const input = presenceSchema.parse(request.body);
    noteUserVisibility(user.id, input.visible);
    return {
      online: input.visible,
      userId: user.id,
      seenAt: new Date().toISOString()
    };
  });

  app.get("/api/v1/proactive/settings", async (request) => {
    return responseFor(requireCurrentUser(request).id);
  });

  app.put("/api/v1/proactive/settings", async (request) => {
    const user = requireCurrentUser(request);
    const input = settingsSchema.parse(request.body) as { talkativeness: Talkativeness };
    await setUserTalkativeness(user.id, input.talkativeness);
    return responseFor(user.id);
  });
};
