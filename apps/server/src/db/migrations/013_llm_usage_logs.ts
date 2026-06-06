import type { DatabaseMigration } from "./index.js";

export const llmUsageLogsMigration: DatabaseMigration = {
  version: 13,
  name: "llm_usage_logs",
  up: `
CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  token_source TEXT NOT NULL,
  estimated_cost REAL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_created
  ON llm_usage_logs(created_at DESC);
`
};
