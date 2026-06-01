import {
  authLoginSchema,
  authRegisterSchema,
  createUserSchema,
  updateUserSchema
} from "@dyn/shared";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import {
  createManagedUser,
  getAuthStatus,
  listManagedUsers,
  loginUser,
  registerUser,
  updateManagedUser
} from "./authService.js";

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/auth/status", async () => getAuthStatus());

  app.post("/api/v1/auth/register", async (request, reply) => {
    try {
      return reply.status(201).send(registerUser(authRegisterSchema.parse(request.body)));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    try {
      return reply.send(loginUser(authLoginSchema.parse(request.body)));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/auth/me", async (request) => ({ user: request.currentUser }));

  app.get("/api/v1/auth/users", async (request, reply) => {
    try {
      return reply.send({ users: listManagedUsers(request.currentUser!) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/auth/users", async (request, reply) => {
    try {
      return reply.status(201).send(createManagedUser(request.currentUser!, createUserSchema.parse(request.body)));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/auth/users/:userId", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      return reply.send({ user: updateManagedUser(request.currentUser!, userId, updateUserSchema.parse(request.body)) });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
