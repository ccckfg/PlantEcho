import { timingSafeEqual } from "node:crypto";
import type { AppUser } from "@dyn/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../../config/env.js";
import { requireActiveUser } from "./authService.js";
import { getAuthSessionByTokenHash, touchAuthSession } from "./authRepository.js";
import { authTokenHash, verifyAuthToken } from "./token.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: AppUser;
    currentSessionId?: string;
  }
}

const PUBLIC_PATHS = [
  "/health",
  "/api/v1/auth/status",
  "/api/v1/auth/register",
  "/api/v1/auth/login"
];
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

const extractBearerToken = (request: FastifyRequest): string => {
  const authorization = request.headers.authorization;
  if (!authorization) return "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token?.trim() ?? "" : "";
};

const isOpenAiCompatPath = (path: string): boolean => path.startsWith("/v1/");
const allowsLegacyAccessKey = (path: string): boolean => !path.startsWith("/api/v1/auth/");

const matchesSecret = (candidate: string, expected: string): boolean => {
  const candidateBuffer = Buffer.from(candidate, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
};

export const registerAppAuth = async (app: FastifyInstance) => {
  const expectedKey = env.APP_ACCESS_KEY.trim();

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") return;

    const path = request.url.split("?")[0] ?? request.url;
    if (!isProtectedPath(path) || isPublicPath(path)) return;

    const bearerToken = extractBearerToken(request);
    const tokenHash = authTokenHash(bearerToken);
    const tokenPayload = verifyAuthToken(bearerToken);
    const user = tokenPayload ? requireActiveUser(tokenPayload.sub) : null;
    const session = tokenPayload ? getAuthSessionByTokenHash(tokenHash) : null;
    const sessionActive =
      session &&
      !session.revokedAt &&
      Date.parse(session.expiresAt) > Date.now();
    if (user && sessionActive) {
      request.currentUser = user;
      request.currentSessionId = session.id;
      touchAuthSession(tokenHash);
      return;
    }

    const providedKey = extractAccessKey(request);
    if (allowsLegacyAccessKey(path) && expectedKey && providedKey && matchesSecret(providedKey, expectedKey)) {
      return;
    }

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
      message: "请先用账号密码登录。"
    });
  });
};
