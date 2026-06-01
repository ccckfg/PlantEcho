import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const generateDeviceApiKey = (): string => {
  return `dyn_dev_${randomBytes(24).toString("base64url")}`;
};

export const hashDeviceApiKey = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const matchesDeviceApiKey = (
  storedHash: string | null,
  candidate?: string
): boolean => {
  if (!storedHash) return true;
  if (!candidate) return false;
  const expected = Buffer.from(storedHash, "utf8");
  const actual = Buffer.from(hashDeviceApiKey(candidate), "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
};
