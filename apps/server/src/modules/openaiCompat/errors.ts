import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export class OpenAiCompatError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly type = "invalid_request_error",
    public readonly param: string | null = null,
    public readonly code: string | null = null
  ) {
    super(message);
  }
}

export const openAiErrorBody = (
  message: string,
  type = "invalid_request_error",
  param: string | null = null,
  code: string | null = null
) => ({
  error: {
    message,
    type,
    param,
    code
  }
});

export const sendOpenAiError = (reply: FastifyReply, error: unknown): FastifyReply => {
  if (error instanceof OpenAiCompatError) {
    return reply
      .status(error.statusCode)
      .send(openAiErrorBody(error.message, error.type, error.param, error.code));
  }

  if (error instanceof ZodError) {
    return reply
      .status(400)
      .send(openAiErrorBody("Invalid request body", "invalid_request_error", null, "validation_error"));
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return reply.status(500).send(openAiErrorBody(message, "server_error", null, "internal_error"));
};
