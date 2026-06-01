import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../../config/env.js";

const PUBLIC_PATHS = ["/health"];
const PROTECTED_PREFIXES = ["/api/", "/v1/"];
const DEVICE_READING_PATH = /^\/api\/v1\/devices\/[^/]+\/readings$/;

const isProtectedPath = (path: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

const isPublicPath = (path: string): boolean =>
  PUBLIC_PATHS.includes(path) || DEVICE_READING_PATH.test(path);

const extractAccessKey = (request: FastifyRequest): string => {
  const apiKey = request.headers["x-api-key"];
  if (typeof apiKey === "string") return apiKey.trim();

  const authorization = request.headers.authorization;
  if (!authorization) return "";

  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token?.trim() ?? "" : "";
};

const isOpenAiCompatPath = (path: string): boolean => path.startsWith("/v1/");

const matchesSecret = (candidate: string, expected: string): boolean => {
  const candidateBuffer = Buffer.from(candidate, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
};

export const registerAppAuth = async (app: FastifyInstance) => {
  const expectedKey = env.APP_ACCESS_KEY.trim();
  if (!expectedKey) return;

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") return;

    const path = request.url.split("?")[0] ?? request.url;
    if (!isProtectedPath(path) || isPublicPath(path)) return;

    const providedKey = extractAccessKey(request);
    if (providedKey && matchesSecret(providedKey, expectedKey)) return;

    if (isOpenAiCompatPath(path)) {
      return reply.status(401).send({
        error: {
          message: "Invalid or missing API key",
          type: "invalid_request_error",
          param: null,
          code: "invalid_api_key"
        }
      });
    }

    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Invalid or missing application access key"
    });
  });
};
