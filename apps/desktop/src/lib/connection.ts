import type { AppUser, AuthSession } from "@dyn/shared";

const STORAGE_KEY = "dyn.backend.connection.v1";

export interface BackendConnectionInput {
  baseUrl: string;
  username: string;
  password: string;
}

export interface BackendConnection {
  baseUrl: string;
  token: string;
  user: AppUser;
  connectedAt: string;
}

export const normalizeBackendUrl = (rawUrl: string): string => {
  const trimmed = rawUrl
    .trim()
    .replace(/[：﹕꞉]/g, ":")
    .replace(/[／⁄∕]/g, "/")
    .replace(/\s+/g, "");
  if (!trimmed) throw new Error("请输入后端地址");

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  const url = new URL(withProtocol);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("后端地址仅支持 HTTP 或 HTTPS");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
};

export const isLoopbackBackendUrl = (rawUrl: string): boolean => {
  try {
    const host = new URL(normalizeBackendUrl(rawUrl)).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
};

export const createBackendConnection = (input: {
  baseUrl: string;
  session: AuthSession;
}): BackendConnection => ({
  baseUrl: normalizeBackendUrl(input.baseUrl),
  token: input.session.token,
  user: input.session.user,
  connectedAt: new Date().toISOString()
});

export const loadConnection = (): BackendConnection | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BackendConnection>;
    if (
      !parsed.baseUrl ||
      typeof parsed.baseUrl !== "string" ||
      !parsed.token ||
      typeof parsed.token !== "string" ||
      !parsed.user
    ) {
      return null;
    }

    return {
      baseUrl: normalizeBackendUrl(parsed.baseUrl),
      token: parsed.token,
      user: parsed.user as AppUser,
      connectedAt:
        typeof parsed.connectedAt === "string"
          ? parsed.connectedAt
          : new Date().toISOString()
    };
  } catch {
    return null;
  }
};

export const saveConnection = (connection: BackendConnection): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
};

export const clearConnection = (): void => {
  window.localStorage.removeItem(STORAGE_KEY);
};
