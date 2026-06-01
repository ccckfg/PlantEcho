import type { AppUser } from "@dyn/shared";
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

export const countUsers = (): number => {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count;
};

export const countActiveAdmins = (): number => {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1")
    .get() as { count: number };
  return row.count;
};

export const listUsers = (): AppUser[] => {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY created_at ASC")
    .all() as UserRow[];
  return rows.map(toUser);
};

export const getUserById = (id: string): (AppUser & { passwordHash: string }) | null => {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
};

export const getUserByUsername = (
  username: string
): (AppUser & { passwordHash: string }) | null => {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get(username) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
};

export const insertUser = (input: {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: AppUser["role"];
}): AppUser => {
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO users
       (id, username, display_name, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(input.id, input.username, input.displayName, input.passwordHash, input.role, now, now);
  return getUserById(input.id)!;
};

export const updateUser = (id: string, patch: UserPatch): AppUser | null => {
  const entries: Array<[string, string | number | null]> = [];
  if (patch.displayName !== undefined) entries.push(["display_name", patch.displayName]);
  if (patch.passwordHash !== undefined) entries.push(["password_hash", patch.passwordHash]);
  if (patch.role !== undefined) entries.push(["role", patch.role]);
  if (patch.isActive !== undefined) entries.push(["is_active", patch.isActive ? 1 : 0]);
  if (patch.lastLoginAt !== undefined) entries.push(["last_login_at", patch.lastLoginAt]);
  if (!entries.length) return getUserById(id);
  entries.push(["updated_at", nowIso()]);
  const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
  getDb().prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...entries.map(([, value]) => value), id);
  return getUserById(id);
};
