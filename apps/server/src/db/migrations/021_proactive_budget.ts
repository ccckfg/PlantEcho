import type { DatabaseMigration } from "./index.js";

export const proactiveBudgetMigration: DatabaseMigration = {
  version: 21,
  name: "proactive_budget",
  up: `
CREATE TABLE IF NOT EXISTS user_proactive_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  talkativeness TEXT NOT NULL DEFAULT 'moderate',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proactive_budget_state (
  scope_id TEXT PRIMARY KEY,
  tokens REAL NOT NULL,
  last_refill_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`
};
