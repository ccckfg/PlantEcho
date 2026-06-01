import type {
  AuthLoginInput,
  AuthLoginSession,
  AuthRegisterInput,
  AuthSession
} from "@dyn/shared";
import {
  createBackendConnection,
  normalizeBackendUrl,
  type BackendConnection,
  type BackendConnectionInput
} from "./connection";

const readErrorDetail = async (res: Response): Promise<string> => {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || JSON.stringify(body);
  } catch {
    return await res.text();
  }
};

const authRequest = async <T>(
  baseUrl: string,
  path: string,
  init?: RequestInit
): Promise<T> => {
  const hasBody = init?.body !== undefined && init.body !== null;
  const headers = new Headers(init?.headers);
  if (hasBody && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(`${normalizeBackendUrl(baseUrl)}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(await readErrorDetail(res));
  return (await res.json()) as T;
};

export const loginWithPassword = async (
  input: BackendConnectionInput
): Promise<BackendConnection> => {
  const session = await authRequest<AuthSession>(input.baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: input.username, password: input.password } satisfies AuthLoginInput)
  });
  return createBackendConnection({ baseUrl: input.baseUrl, session });
};

export const registerWithPassword = async (
  input: BackendConnectionInput & { displayName?: string }
): Promise<BackendConnection> => {
  const session = await authRequest<AuthSession>(input.baseUrl, "/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      displayName: input.displayName
    } satisfies AuthRegisterInput)
  });
  return createBackendConnection({ baseUrl: input.baseUrl, session });
};

export const authApi = {
  status: (baseUrl: string) =>
    authRequest<{ hasUsers: boolean; registrationEnabled: boolean }>(
      baseUrl,
      "/api/v1/auth/status"
    ),
  listSessions: (baseUrl: string, token: string) =>
    authRequest<{ sessions: AuthLoginSession[] }>(baseUrl, "/api/v1/auth/sessions", {
      headers: { authorization: `Bearer ${token}` }
    }),
  revokeSession: (baseUrl: string, token: string, sessionId: string) =>
    authRequest<{ session: AuthLoginSession }>(
      baseUrl,
      `/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` }
      }
    )
};
