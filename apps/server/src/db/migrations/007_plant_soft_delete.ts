import type { DatabaseMigration } from "./index.js";

export const plantSoftDeleteMigration: DatabaseMigration = {
  version: 7,
  name: "plant_soft_delete",
  up: `
ALTER TABLE plants ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE plants ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_plants_status_created
  ON plants(status, created_at);
`
};
