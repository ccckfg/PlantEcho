import type { DatabaseMigration } from "./index.js";

export const turnCountersAndRetentionMigration: DatabaseMigration = {
  version: 17,
  name: "turn_counters_and_retention_indexes",
  up: `
CREATE TABLE IF NOT EXISTS plant_turn_counters (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  next_turn INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readings_created
  ON sensor_readings(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_devices_cleanup
  ON pending_devices(claim_status, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_drafts_consumed_at
  ON memory_drafts(consumed_at);
CREATE INDEX IF NOT EXISTS idx_jobs_cleanup
  ON background_jobs(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_created
  ON sync_events(created_at);
CREATE INDEX IF NOT EXISTS idx_proactive_event_fired
  ON proactive_event_log(fired_at);
CREATE INDEX IF NOT EXISTS idx_proactive_reminders_cleanup
  ON proactive_reminders(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_cleanup
  ON auth_sessions(revoked_at, expires_at);
`
};
