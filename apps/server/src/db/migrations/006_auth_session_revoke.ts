import type { DatabaseMigration } from "./index.js";

export const authSessionRevokeMigration: DatabaseMigration = {
  version: 6,
  name: "auth_session_revoke",
  up: `
ALTER TABLE auth_sessions ADD COLUMN revoked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_active
  ON auth_sessions(user_id, revoked_at, expires_at);
`
};
