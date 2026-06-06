import type { FastifyReply } from "fastify";
import { ZodError } from "zod";
import { ServiceError } from "./serviceError.js";

export const sendError = (reply: FastifyReply, error: unknown): FastifyReply => {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: "VALIDATION_ERROR", details: error.flatten() });
  }
  if (error instanceof ServiceError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return reply.status(500).send({ error: "INTERNAL_ERROR", message });
};
