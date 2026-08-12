import type { DatabaseMigration } from "./index.js";

export const proactiveTriggersMigration: DatabaseMigration = {
  version: 22,
  name: "proactive_body_and_temporal_triggers",
  up: `
CREATE TABLE IF NOT EXISTS proactive_body_state (
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  ewma_value REAL NOT NULL,
  condition_code TEXT,
  abnormal_since TEXT,
  last_observed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plant_id, metric)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intentions_trigger_source
  ON plant_intentions(plant_id, source_type, source_id)
  WHERE source_id IS NOT NULL AND source_type IN ('sensor', 'temporal');
`
};
