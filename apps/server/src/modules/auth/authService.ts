import { randomUUID } from "node:crypto";
import type {
  AppUser,
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
import { hashPassword, verifyPassword } from "./password.js";
import { authTokenHash, issueAuthToken } from "./token.js";

export interface LoginSessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

const assertAdmin = (actor: AppUser): void => {
  if (actor.role !== "admin") throw new Error("需要管理员账号来照看这里。");
};

const assertCanChangeAdmin = (target: AppUser, patch: UpdateUserInput): void => {
  const removesAdmin =
    target.role === "admin" &&
    (patch.role === "user" || patch.isActive === false);
  if (removesAdmin && countActiveAdmins() <= 1) {
    throw new Error("至少需要保留一个可用的管理员账号。");
  }
};

export const getAuthStatus = () => ({
  hasUsers: countUsers() > 0,
  registrationEnabled: env.AUTH_REGISTRATION_ENABLED
});

const createSession = (user: AppUser, meta: LoginSessionMeta = {}): AuthSession => {
  const token = issueAuthToken({ userId: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + env.AUTH_TOKEN_TTL_HOURS * 3600_000).toISOString();
  insertAuthSession({
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
): AuthSession => {
  if (!env.AUTH_REGISTRATION_ENABLED && countUsers() > 0) {
    throw new Error("注册暂时没有开放。");
  }
  if (getUserByUsername(input.username)) throw new Error("这个账号名已经被使用。");
  const firstUser = countUsers() === 0;
  const user = insertUser({
    id: randomUUID(),
    username: input.username.trim(),
    displayName: input.displayName?.trim() || input.username.trim(),
    passwordHash: hashPassword(input.password),
    role: firstUser ? "admin" : "user"
  });
  return createSession(user, meta);
};

export const loginUser = (
  input: AuthLoginInput,
  meta?: LoginSessionMeta
): AuthSession => {
  const user = getUserByUsername(input.username);
  if (!user || !user.isActive || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error("账号或密码没有对上，请再试一次。");
  }
  const updated = updateUser(user.id, { lastLoginAt: nowIso() }) ?? user;
  return createSession(updated, meta);
};

export const requireActiveUser = (userId: string): AppUser | null => {
  const user = getUserById(userId);
  return user?.isActive ? user : null;
};

export const listOwnSessions = (
  actor: AppUser,
  currentSessionId?: string
) => listUserAuthSessions(actor.id).map((session) => ({
  ...session,
  current: session.id === currentSessionId
}));

export const revokeOwnSession = (
  actor: AppUser,
  sessionId: string
) => {
  const session = getAuthSession(sessionId);
  if (!session || session.userId !== actor.id) {
    throw new Error(`Session ${sessionId} not found`);
  }
  if (session.revokedAt) {
    deleteUserAuthSession(actor.id, sessionId);
    return { ...session, deleted: true };
  } else {
    const revoked = revokeUserAuthSession(actor.id, sessionId);
    if (!revoked) throw new Error(`Failed to revoke session ${sessionId}`);
    return revoked;
  }
};

export const listManagedUsers = (actor: AppUser): AppUser[] => {
  assertAdmin(actor);
  return listUsers();
};

export const createManagedUser = (actor: AppUser, input: CreateUserInput): AuthSession => {
  assertAdmin(actor);
  if (getUserByUsername(input.username)) throw new Error("这个账号名已经被使用。");
  const user = insertUser({
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
): AppUser => {
  assertAdmin(actor);
  const target = getUserById(userId);
  if (!target) throw new Error(`User ${userId} not found`);
  assertCanChangeAdmin(target, input);
  const updated = updateUser(userId, {
    displayName: input.displayName?.trim(),
    role: input.role,
    isActive: input.isActive,
    passwordHash: input.password ? hashPassword(input.password) : undefined
  });
  if (!updated) throw new Error(`User ${userId} not found`);
  return updated;
};
