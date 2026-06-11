import type { DatabaseMigration } from "./index.js";

export const careRecordsMigration: DatabaseMigration = {
  version: 18,
  name: "care_records",
  up: `
CREATE TABLE IF NOT EXISTS care_records (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'panel',
  performed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_records_plant
  ON care_records(plant_id, performed_at DESC, id DESC);
`
};
