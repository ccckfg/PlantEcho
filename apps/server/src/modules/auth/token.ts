import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

export interface AuthTokenPayload {
  sub: string;
  role: "admin" | "user";
  iat: number;
  exp: number;
}

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const sign = (body: string): string =>
  createHmac("sha256", env.AUTH_TOKEN_SECRET).update(body).digest("base64url");

const parseJson = (value: string): unknown => JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

export const issueAuthToken = (input: { userId: string; role: "admin" | "user" }): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: input.userId,
    role: input.role,
    iat: now,
    exp: now + env.AUTH_TOKEN_TTL_HOURS * 3600
  };
  const body = `${encode({ alg: "HS256", typ: "DYN" })}.${encode(payload)}`;
  return `${body}.${sign(body)}`;
};

export const verifyAuthToken = (token: string): AuthTokenPayload | null => {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const body = `${header}.${payload}`;
  const expected = sign(body);
  const givenBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (givenBuffer.length !== expectedBuffer.length || !timingSafeEqual(givenBuffer, expectedBuffer)) {
    return null;
  }
  const parsed = parseJson(payload) as Partial<AuthTokenPayload>;
  if (!parsed.sub || !parsed.role || !parsed.exp) return null;
  if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
  return parsed as AuthTokenPayload;
};
