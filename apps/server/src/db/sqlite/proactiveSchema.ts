export const sqliteProactiveSchemaSql = `
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

CREATE TABLE IF NOT EXISTS plant_intentions (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  not_before TEXT,
  expires_at TEXT,
  last_considered_at TEXT,
  considered_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_status_tags (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  tags_json TEXT NOT NULL,
  source_turn INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
`;
