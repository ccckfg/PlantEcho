import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("base64url");
  return `scrypt:${salt}:${hash}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expectedBuffer = Buffer.from(expected, "base64url");
  return candidate.length === expectedBuffer.length && timingSafeEqual(candidate, expectedBuffer);
};
