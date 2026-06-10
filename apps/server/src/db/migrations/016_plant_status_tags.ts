import type { DatabaseMigration } from "./index.js";

export const plantStatusTagsMigration: DatabaseMigration = {
  version: 16,
  name: "plant_status_tags",
  up: `
CREATE TABLE IF NOT EXISTS plant_status_tags (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  tags_json TEXT NOT NULL,
  source_turn INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`
};
