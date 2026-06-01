const STORAGE_KEY = "dyn.backend.connection.v1";

export interface BackendConnectionInput {
  baseUrl: string;
  apiKey: string;
}

export interface BackendConnection extends BackendConnectionInput {
  connectedAt: string;
}

export const normalizeBackendUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
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

export const createBackendConnection = (
  input: BackendConnectionInput
): BackendConnection => ({
  baseUrl: normalizeBackendUrl(input.baseUrl),
  apiKey: input.apiKey.trim(),
  connectedAt: new Date().toISOString()
});

export const loadConnection = (): BackendConnection | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BackendConnection>;
    if (!parsed.baseUrl || typeof parsed.baseUrl !== "string") return null;

    return {
      baseUrl: normalizeBackendUrl(parsed.baseUrl),
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
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
