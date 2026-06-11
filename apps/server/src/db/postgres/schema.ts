export const postgresSchemaSql = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  persona_profile_id TEXT NOT NULL,
  avatar_url TEXT,
  location TEXT NOT NULL DEFAULT '',
  care_profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at TEXT,
  background_info TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key_hash TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  disabled_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS pending_devices (
  id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  latest_payload_json TEXT NOT NULL,
  rssi INTEGER,
  claim_status TEXT NOT NULL DEFAULT 'pending',
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS user_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rotated_at TEXT,
  last_used_at TEXT
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
  id BIGSERIAL PRIMARY KEY,
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
  id BIGSERIAL PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  visible_to_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_turn_counters (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  next_turn INTEGER NOT NULL,
  updated_at TEXT NOT NULL
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
  id BIGSERIAL PRIMARY KEY,
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
  id BIGSERIAL PRIMARY KEY,
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
  created_at TEXT NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(keywords_json, ''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS plant_understandings (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords_json TEXT NOT NULL,
  linked_memories_json TEXT NOT NULL,
  history_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(subject, '') || ' ' || coalesce(content, '') || ' ' || coalesce(keywords_json, ''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS vector_index_items (
  id BIGSERIAL PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  index_text TEXT NOT NULL,
  embedding_dim INTEGER,
  embedding_provider TEXT,
  embedding_model TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(target_type, target_id)
);

CREATE TABLE IF NOT EXISTS history_window_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  start_turn INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proactive_event_log (
  id BIGSERIAL PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
  payload_json TEXT NOT NULL,
  fired_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proactive_reminders (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  source_message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS plant_inner_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  mood TEXT NOT NULL DEFAULT '平静',
  concern TEXT NOT NULL DEFAULT '',
  thought TEXT NOT NULL DEFAULT '',
  source_turn INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_relationship_state (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT '初识',
  summary TEXT NOT NULL DEFAULT '刚刚认识主人',
  evidence_memory_ids_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
`;
