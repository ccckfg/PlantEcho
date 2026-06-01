import { randomUUID } from "node:crypto";
import { closeDb } from "../src/db/connection.js";
import { migrate } from "../src/db/migrate.js";
import {
  countActiveAdmins,
  getUserByUsername,
  insertUser,
  listAuthSessions,
  listUsers,
  updateUser
} from "../src/modules/auth/authRepository.js";
import { hashPassword } from "../src/modules/auth/password.js";

type Role = "admin" | "user";

const args = process.argv.slice(2);

const valueOf = (name: string): string => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] ?? "" : "";
};

const has = (name: string): boolean => args.includes(`--${name}`);

const printHelp = (): void => {
  console.log(`
DYN user CLI

Commands:
  list-users
  create-user --username <name> --password <pwd> [--display-name <name>] [--role user|admin]
  set-role --username <name> --role user|admin
  enable-user --username <name>
  disable-user --username <name>
  reset-password --username <name> --password <pwd>
  list-sessions [--limit 50]
`);
};

const requireValue = (name: string): string => {
  const value = valueOf(name).trim();
  if (!value) throw new Error(`Missing --${name}`);
  return value;
};

const parseRole = (): Role => {
  const role = valueOf("role").trim() || "user";
  if (role !== "admin" && role !== "user") throw new Error("--role must be user or admin");
  return role;
};

const assertPassword = (password: string): void => {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
};

const list = (): void => {
  console.table(
    listUsers().map((user) => ({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      active: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? ""
    }))
  );
};

const create = (): void => {
  const username = requireValue("username");
  const password = requireValue("password");
  assertPassword(password);
  if (getUserByUsername(username)) throw new Error(`User ${username} already exists`);
  const user = insertUser({
    id: randomUUID(),
    username,
    displayName: valueOf("display-name").trim() || username,
    passwordHash: hashPassword(password),
    role: parseRole()
  });
  console.log(`Created ${user.username} (${user.role})`);
};

const setRole = (): void => {
  const username = requireValue("username");
  const role = parseRole();
  const user = getUserByUsername(username);
  if (!user) throw new Error(`User ${username} not found`);
  if (user.role === "admin" && role === "user" && countActiveAdmins() <= 1) {
    throw new Error("Refusing to remove the last active admin");
  }
  updateUser(user.id, { role });
  console.log(`Updated ${username} role to ${role}`);
};

const setActive = (isActive: boolean): void => {
  const username = requireValue("username");
  const user = getUserByUsername(username);
  if (!user) throw new Error(`User ${username} not found`);
  if (user.role === "admin" && !isActive && countActiveAdmins() <= 1) {
    throw new Error("Refusing to disable the last active admin");
  }
  updateUser(user.id, { isActive });
  console.log(`${isActive ? "Enabled" : "Disabled"} ${username}`);
};

const resetPassword = (): void => {
  const username = requireValue("username");
  const password = requireValue("password");
  assertPassword(password);
  const user = getUserByUsername(username);
  if (!user) throw new Error(`User ${username} not found`);
  updateUser(user.id, { passwordHash: hashPassword(password) });
  console.log(`Reset password for ${username}`);
};

const listSessions = (): void => {
  const limit = Number(valueOf("limit") || 50);
  console.table(
    listAuthSessions(Number.isFinite(limit) ? Math.max(1, Math.min(500, limit)) : 50)
      .map((session) => ({
        username: session.username,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt
      }))
  );
};

const run = (): void => {
  const command = args[0] ?? "help";
  if (command === "help" || has("help")) return printHelp();
  migrate();
  if (command === "list-users") return list();
  if (command === "create-user") return create();
  if (command === "set-role") return setRole();
  if (command === "enable-user") return setActive(true);
  if (command === "disable-user") return setActive(false);
  if (command === "reset-password") return resetPassword();
  if (command === "list-sessions") return listSessions();
  throw new Error(`Unknown command: ${command}`);
};

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  closeDb();
}
