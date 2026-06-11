import type { AppUser, AuthLoginSession } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: AppUser["role"];
  is_active: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type UserPatch = Partial<{
  displayName: string;
  passwordHash: string;
  role: AppUser["role"];
  isActive: boolean;
  lastLoginAt: string | null;
}>;

type SessionRow = {
  id: string;
  user_id: string;
  username: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

export const toUser = (row: UserRow): AppUser => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  role: row.role,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastLoginAt: row.last_login_at
});

const toSession = (row: SessionRow): AuthLoginSession => ({
  id: row.id,
  userId: row.user_id,
  username: row.username,
  userAgent: row.user_agent,
  ipAddress: row.ip_address,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  lastSeenAt: row.last_seen_at,
  revokedAt: row.revoked_at
});

export const countUsers = async (): Promise<number> => {
  const row = await getDb().prepare("SELECT COUNT(*) AS count FROM users").get<{ count: number }>();
  return row?.count ?? 0;
};

export const countActiveAdmins = async (): Promise<number> => {
  const row = await getDb()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1")
    .get<{ count: number }>();
  return row?.count ?? 0;
};

export const listUsers = async (): Promise<AppUser[]> => {
  const rows = await getDb()
    .prepare("SELECT * FROM users ORDER BY created_at ASC")
    .all<UserRow>();
  return rows.map(toUser);
};

export const getUserById = async (
  id: string
): Promise<(AppUser & { passwordHash: string }) | null> => {
  const row = await getDb().prepare("SELECT * FROM users WHERE id = ?").get<UserRow>(id);
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
};

export const getUserByUsername = (
  username: string
): Promise<(AppUser & { passwordHash: string }) | null> => {
  return getUserByUsernameAsync(username);
};

const getUserByUsernameAsync = async (
  username: string
): Promise<(AppUser & { passwordHash: string }) | null> => {
  const row = await getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get<UserRow>(username);
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
};

export const insertUser = async (input: {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: AppUser["role"];
}): Promise<AppUser> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO users
       (id, username, display_name, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(input.id, input.username, input.displayName, input.passwordHash, input.role, now, now);
  return (await getUserById(input.id))!;
};

export const updateUser = async (id: string, patch: UserPatch): Promise<AppUser | null> => {
  const entries: Array<[string, string | number | null]> = [];
  if (patch.displayName !== undefined) entries.push(["display_name", patch.displayName]);
  if (patch.passwordHash !== undefined) entries.push(["password_hash", patch.passwordHash]);
  if (patch.role !== undefined) entries.push(["role", patch.role]);
  if (patch.isActive !== undefined) entries.push(["is_active", patch.isActive ? 1 : 0]);
  if (patch.lastLoginAt !== undefined) entries.push(["last_login_at", patch.lastLoginAt]);
  if (!entries.length) return getUserById(id);
  entries.push(["updated_at", nowIso()]);
  const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
  await getDb().prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...entries.map(([, value]) => value), id);
  return getUserById(id);
};

export const insertAuthSession = async (input: {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
}): Promise<AuthLoginSession> => {
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO auth_sessions
       (id, user_id, token_hash, user_agent, ip_address, created_at, expires_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.userId,
      input.tokenHash,
      input.userAgent,
      input.ipAddress,
      now,
      input.expiresAt,
      now
    );
  return (await getAuthSession(input.id))!;
};

export const getAuthSession = async (id: string): Promise<AuthLoginSession | null> => {
  const row = await getDb()
    .prepare(
      `SELECT auth_sessions.*, users.username
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.id = ?`
    )
    .get<SessionRow>(id);
  return row ? toSession(row) : null;
};

export const touchAuthSession = async (tokenHash: string): Promise<void> => {
  await getDb()
    .prepare(
      `UPDATE auth_sessions SET last_seen_at = ?
       WHERE token_hash = ? AND revoked_at IS NULL`
    )
    .run(nowIso(), tokenHash);
};

export const getAuthSessionByTokenHash = async (
  tokenHash: string
): Promise<AuthLoginSession | null> => {
  const row = await getDb()
    .prepare(
      `SELECT auth_sessions.*, users.username
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.token_hash = ?`
    )
    .get<SessionRow>(tokenHash);
  return row ? toSession(row) : null;
};

export const listUserAuthSessions = async (userId: string): Promise<AuthLoginSession[]> => {
  const rows = await getDb()
    .prepare(
      `SELECT auth_sessions.*, users.username
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.user_id = ?
       ORDER BY auth_sessions.last_seen_at DESC`
    )
    .all<SessionRow>(userId);
  return rows.map(toSession);
};

export const revokeUserAuthSession = async (
  userId: string,
  sessionId: string
): Promise<AuthLoginSession | null> => {
  await getDb()
    .prepare(
      `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?)
       WHERE id = ? AND user_id = ?`
    )
    .run(nowIso(), sessionId, userId);
  return getAuthSession(sessionId);
};

export const listAuthSessions = async (limit = 50): Promise<AuthLoginSession[]> => {
  const rows = await getDb()
    .prepare(
      `SELECT auth_sessions.*, users.username
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       ORDER BY auth_sessions.created_at DESC
       LIMIT ?`
    )
    .all<SessionRow>(limit);
  return rows.map(toSession);
};

export const deleteUserAuthSession = async (
  userId: string,
  sessionId: string
): Promise<boolean> => {
  const result = await getDb()
    .prepare("DELETE FROM auth_sessions WHERE id = ? AND user_id = ?")
    .run(sessionId, userId);
  return result.changes > 0;
};
