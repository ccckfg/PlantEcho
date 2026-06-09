import type { DatabaseMigration } from "./index.js";

export const userApiKeysMigration: DatabaseMigration = {
  version: 15,
  name: "user_api_keys",
  up: `
CREATE TABLE IF NOT EXISTS user_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rotated_at TEXT,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash
  ON user_api_keys(key_hash);
`
};
