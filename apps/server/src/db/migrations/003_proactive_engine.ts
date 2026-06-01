import type { DatabaseMigration } from "./index.js";

export const proactiveEngineMigration: DatabaseMigration = {
  version: 3,
  name: "proactive_engine",
  up: `
CREATE TABLE IF NOT EXISTS proactive_event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  payload_json TEXT NOT NULL,
  fired_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proactive_reminders (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  source_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proactive_event_key
  ON proactive_event_log(plant_id, event_key, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_reminders_due
  ON proactive_reminders(status, remind_at);
`
};
