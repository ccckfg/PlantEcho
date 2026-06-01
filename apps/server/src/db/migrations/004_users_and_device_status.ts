import type { DatabaseMigration } from "./index.js";

export const usersAndDeviceStatusMigration: DatabaseMigration = {
  version: 4,
  name: "users_and_device_status",
  up: `
ALTER TABLE devices ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE devices ADD COLUMN disabled_at TEXT;
ALTER TABLE devices ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_status
  ON devices(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role, is_active);
`
};
