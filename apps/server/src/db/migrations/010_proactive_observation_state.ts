import type { DatabaseMigration } from "./index.js";

export const proactiveObservationStateMigration: DatabaseMigration = {
  version: 10,
  name: "proactive_observation_state",
  up: `
CREATE TABLE IF NOT EXISTS proactive_observation_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  observations INTEGER NOT NULL DEFAULT 1,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  considered_at TEXT
);
`
};
