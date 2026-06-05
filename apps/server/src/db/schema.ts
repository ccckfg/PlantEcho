export const schemaSql = `
CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  persona_profile_id TEXT NOT NULL,
  avatar_url TEXT,
  location TEXT NOT NULL DEFAULT '',
  care_profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key_hash TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_devices (
  id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  latest_payload_json TEXT NOT NULL,
  rssi INTEGER,
  claim_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS device_config_deliveries (
  device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  captured_at TEXT NOT NULL,
  soil_raw INTEGER,
  soil_percent REAL,
  air_temp_c REAL,
  air_humidity_percent REAL,
  light_lux REAL,
  rssi INTEGER,
  battery_mv INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_status (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  relationship TEXT NOT NULL,
  focus TEXT NOT NULL,
  last_summary TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  visible_to_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_photos (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content_path TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  text TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_consolidation_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  active INTEGER NOT NULL DEFAULT 0,
  pending_turn INTEGER,
  last_completed_turn INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS background_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  dedupe_key TEXT,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  run_after TEXT NOT NULL,
  locked_at TEXT,
  locked_by TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  plant_id TEXT REFERENCES plants(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_memories (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  participants TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords_json TEXT NOT NULL,
  importance INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  raw_dialogue TEXT NOT NULL DEFAULT '',
  raw_payload_json TEXT NOT NULL,
  last_recalled_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_understandings (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords_json TEXT NOT NULL,
  linked_memories_json TEXT NOT NULL,
  history_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS plant_memories_fts USING fts5(
  target_id UNINDEXED,
  plant_id UNINDEXED,
  title,
  content,
  keywords,
  tokenize='unicode61'
);

CREATE VIRTUAL TABLE IF NOT EXISTS plant_understandings_fts USING fts5(
  target_id UNINDEXED,
  plant_id UNINDEXED,
  subject,
  content,
  keywords,
  tokenize='unicode61'
);

CREATE TABLE IF NOT EXISTS vector_index_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  index_text TEXT NOT NULL,
  embedding_dim INTEGER,
  updated_at TEXT NOT NULL,
  UNIQUE(target_type, target_id)
);

CREATE TABLE IF NOT EXISTS history_window_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  start_turn INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS proactive_observation_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  observations INTEGER NOT NULL DEFAULT 1,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  considered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_readings_plant_time
  ON sensor_readings(plant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_devices_status
  ON pending_devices(claim_status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_config_deliveries_updated
  ON device_config_deliveries(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_plant_turn
  ON messages(plant_id, turn DESC);
CREATE INDEX IF NOT EXISTS idx_photos_plant_captured
  ON plant_photos(plant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_plant_created
  ON plant_memories(plant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_unconsumed
  ON memory_drafts(plant_id, consumed_at);
CREATE INDEX IF NOT EXISTS idx_vector_index_target
  ON vector_index_items(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_jobs_ready
  ON background_jobs(status, run_after, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_locked
  ON background_jobs(status, locked_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_active_dedupe
  ON background_jobs(dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS idx_sync_events_id
  ON sync_events(id);
CREATE INDEX IF NOT EXISTS idx_sync_events_plant
  ON sync_events(plant_id, id);
CREATE INDEX IF NOT EXISTS idx_proactive_event_key
  ON proactive_event_log(plant_id, event_key, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_reminders_due
  ON proactive_reminders(status, remind_at);
`;
