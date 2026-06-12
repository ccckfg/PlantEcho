import { randomBytes, randomUUID } from "node:crypto";
import type {
  AppUser,
  AuthApiKeyCreated,
  AuthApiKeyInfo,
  AuthLoginInput,
  AuthRegisterInput,
  AuthSession,
  CreateUserInput,
  UpdateUserInput
} from "@dyn/shared";
import { env } from "../../config/env.js";
import { nowIso } from "../../shared/time.js";
import {
  countActiveAdmins,
  countUsers,
  getAuthSession,
  getUserById,
  getUserByUsername,
  insertAuthSession,
  insertUser,
  listUserAuthSessions,
  listUsers,
  revokeUserAuthSession,
  deleteUserAuthSession,
  updateUser
} from "./authRepository.js";
import { getUserApiKeyInfo, upsertUserApiKey } from "./authApiKeyRepository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { authTokenHash, issueAuthToken } from "./token.js";
import { assignUnownedPlantsToUser } from "../plants/plantRepository.js";

export interface LoginSessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

const assertAdmin = (actor: AppUser): void => {
  if (actor.role !== "admin") throw new Error("需要管理员账号来照看这里。");
};

const assertCanChangeAdmin = async (target: AppUser, patch: UpdateUserInput): Promise<void> => {
  const removesAdmin =
    target.role === "admin" &&
    (patch.role === "user" || patch.isActive === false);
  if (removesAdmin && await countActiveAdmins() <= 1) {
    throw new Error("至少需要保留一个可用的管理员账号。");
  }
};

const createPlainApiKey = (): string =>
  `dyn_api_${randomBytes(32).toString("base64url")}`;

const apiKeyParts = (key: string) => ({
  keyHash: authTokenHash(key),
  keyPrefix: key.slice(0, 12),
  keyLast4: key.slice(-4)
});

export const getAuthStatus = async () => ({
  hasUsers: await countUsers() > 0,
  registrationEnabled: env.AUTH_REGISTRATION_ENABLED
});

const createSession = async (user: AppUser, meta: LoginSessionMeta = {}): Promise<AuthSession> => {
  const token = issueAuthToken({ userId: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + env.AUTH_TOKEN_TTL_HOURS * 3600_000).toISOString();
  await insertAuthSession({
    id: randomUUID(),
    userId: user.id,
    tokenHash: authTokenHash(token),
    userAgent: meta.userAgent?.trim().slice(0, 500) ?? "",
    ipAddress: meta.ipAddress?.trim().slice(0, 120) ?? "",
    expiresAt
  });
  return { token, user };
};

export const registerUser = (
  input: AuthRegisterInput,
  meta?: LoginSessionMeta
): Promise<AuthSession> => {
  return registerUserAsync(input, meta);
};

const registerUserAsync = async (
  input: AuthRegisterInput,
  meta?: LoginSessionMeta
): Promise<AuthSession> => {
  const existingCount = await countUsers();
  if (!env.AUTH_REGISTRATION_ENABLED && existingCount > 0) {
    throw new Error("注册暂时没有开放。");
  }
  if (await getUserByUsername(input.username)) throw new Error("这个账号名已经被使用。");
  const firstUser = existingCount === 0;
  const user = await insertUser({
    id: randomUUID(),
    username: input.username.trim(),
    displayName: input.displayName?.trim() || input.username.trim(),
    passwordHash: hashPassword(input.password),
    role: firstUser ? "admin" : "user"
  });
  if (firstUser) await assignUnownedPlantsToUser(user.id);
  return createSession(user, meta);
};

export const loginUser = (
  input: AuthLoginInput,
  meta?: LoginSessionMeta
): Promise<AuthSession> => {
  return loginUserAsync(input, meta);
};

const loginUserAsync = async (
  input: AuthLoginInput,
  meta?: LoginSessionMeta
): Promise<AuthSession> => {
  const user = await getUserByUsername(input.username);
  if (!user || !user.isActive || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error("账号或密码没有对上，请再试一次。");
  }
  const updated = await updateUser(user.id, { lastLoginAt: nowIso() }) ?? user;
  return createSession(updated, meta);
};

export const requireActiveUser = async (userId: string): Promise<AppUser | null> => {
  const user = await getUserById(userId);
  return user?.isActive ? user : null;
};

export const listOwnSessions = (
  actor: AppUser,
  currentSessionId?: string
) => listOwnSessionsAsync(actor, currentSessionId);

const listOwnSessionsAsync = async (
  actor: AppUser,
  currentSessionId?: string
) => (await listUserAuthSessions(actor.id)).map((session) => ({
    ...session,
    current: session.id === currentSessionId
  }));

export const revokeOwnSession = async (
  actor: AppUser,
  sessionId: string
) => {
  const session = await getAuthSession(sessionId);
  if (!session || session.userId !== actor.id) {
    throw new Error(`Session ${sessionId} not found`);
  }
  if (session.revokedAt) {
    await deleteUserAuthSession(actor.id, sessionId);
    return { ...session, deleted: true };
  } else {
    const revoked = await revokeUserAuthSession(actor.id, sessionId);
    if (!revoked) throw new Error(`Failed to revoke session ${sessionId}`);
    return revoked;
  }
};

export const getOwnApiKey = (actor: AppUser): Promise<AuthApiKeyInfo | null> =>
  getUserApiKeyInfo(actor.id);

export const generateOwnApiKey = async (actor: AppUser): Promise<AuthApiKeyCreated> => {
  if (await getUserApiKeyInfo(actor.id)) {
    throw new Error("API 调用密钥已经存在，请使用轮换密钥。");
  }
  const key = createPlainApiKey();
  const apiKey = await upsertUserApiKey({
    id: randomUUID(),
    userId: actor.id,
    ...apiKeyParts(key)
  });
  return { apiKey, key };
};

export const rotateOwnApiKey = async (actor: AppUser): Promise<AuthApiKeyCreated> => {
  const key = createPlainApiKey();
  const apiKey = await upsertUserApiKey({
    id: randomUUID(),
    userId: actor.id,
    ...apiKeyParts(key)
  });
  return { apiKey, key };
};

export const listManagedUsers = async (actor: AppUser): Promise<AppUser[]> => {
  assertAdmin(actor);
  return listUsers();
};

export const createManagedUser = async (
  actor: AppUser,
  input: CreateUserInput
): Promise<AuthSession> => {
  assertAdmin(actor);
  if (await getUserByUsername(input.username)) throw new Error("这个账号名已经被使用。");
  const user = await insertUser({
    id: randomUUID(),
    username: input.username.trim(),
    displayName: input.displayName?.trim() || input.username.trim(),
    passwordHash: hashPassword(input.password),
    role: input.role
  });
  return { token: "", user };
};

export const updateManagedUser = (
  actor: AppUser,
  userId: string,
  input: UpdateUserInput
): Promise<AppUser> => {
  return updateManagedUserAsync(actor, userId, input);
};

const updateManagedUserAsync = async (
  actor: AppUser,
  userId: string,
  input: UpdateUserInput
): Promise<AppUser> => {
  assertAdmin(actor);
  const target = await getUserById(userId);
  if (!target) throw new Error(`User ${userId} not found`);
  await assertCanChangeAdmin(target, input);
  const updated = await updateUser(userId, {
    displayName: input.displayName?.trim(),
    role: input.role,
    isActive: input.isActive,
    passwordHash: input.password ? hashPassword(input.password) : undefined
  });
  if (!updated) throw new Error(`User ${userId} not found`);
  return updated;
};
