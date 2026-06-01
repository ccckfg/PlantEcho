import { env } from "../src/config/env.js";

export const smokeDefaults = {
  host: env.HOST === "0.0.0.0" ? "127.0.0.1" : env.HOST,
  plantId: process.env.SMOKE_PLANT_ID ?? env.DEFAULT_PLANT_ID,
  appAccessKey: process.env.APP_ACCESS_KEY ?? env.APP_ACCESS_KEY
};

export const baseUrl = (
  process.env.SERVER_URL ?? `http://${smokeDefaults.host}:${env.PORT}`
).replace(/\/+$/, "");

export const jsonHeaders = (extra?: Record<string, string>): Headers => {
  const headers = new Headers({ "content-type": "application/json" });
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) headers.set(key, value);
  }
  return headers;
};

export const appHeaders = (): Headers => {
  const key = smokeDefaults.appAccessKey;
  return jsonHeaders(
    key
      ? {
          "x-api-key": key,
          authorization: `Bearer ${key}`
        }
      : undefined
  );
};

export const readJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got: ${text}`);
  }
};

export const expectStatus = (label: string, actual: number, expected: number): void => {
  if (actual !== expected) {
    throw new Error(`${label} expected HTTP ${expected}, got ${actual}`);
  }
  console.log(`OK ${label}: HTTP ${actual}`);
};

export const fetchJson = async <T>(
  path: string,
  init?: RequestInit
): Promise<{ response: Response; body: T }> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  return {
    response,
    body: await readJson<T>(response)
  };
};

export const waitFor = async <T>(
  label: string,
  probe: () => Promise<T | null>,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> => {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const intervalMs = options.intervalMs ?? 1_500;
  const startedAt = Date.now();
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await probe();
      if (value) return value;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `${label} timed out after ${timeoutMs}ms${lastError ? `: ${lastError}` : ""}`
  );
};
