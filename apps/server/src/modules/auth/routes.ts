import {
  authLoginSchema,
  authRegisterSchema
} from "@dyn/shared";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import {
  getAuthStatus,
  generateOwnApiKey,
  getOwnApiKey,
  listOwnSessions,
  loginUser,
  registerUser,
  revokeOwnSession,
  rotateOwnApiKey
} from "./authService.js";

const sessionMeta = (request: { headers: Record<string, unknown>; ip: string }) => ({
  userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : "",
  ipAddress: request.ip
});

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/auth/status", async () => getAuthStatus());

  app.post("/api/v1/auth/register", async (request, reply) => {
    try {
      return reply.status(201).send(registerUser(
        authRegisterSchema.parse(request.body),
        sessionMeta(request)
      ));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    try {
      return reply.send(loginUser(
        authLoginSchema.parse(request.body),
        sessionMeta(request)
      ));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/auth/me", async (request) => ({ user: request.currentUser }));

  app.get("/api/v1/auth/sessions", async (request) => ({
    sessions: listOwnSessions(request.currentUser!, request.currentSessionId)
  }));

  app.get("/api/v1/auth/api-key", async (request) => ({
    apiKey: getOwnApiKey(request.currentUser!)
  }));

  app.post("/api/v1/auth/api-key", async (request, reply) => {
    try {
      return reply.status(201).send(generateOwnApiKey(request.currentUser!));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/auth/api-key/rotate", async (request, reply) => {
    try {
      return reply.send(rotateOwnApiKey(request.currentUser!));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/v1/auth/sessions/:sessionId", async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      return reply.send({ session: revokeOwnSession(request.currentUser!, sessionId) });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
