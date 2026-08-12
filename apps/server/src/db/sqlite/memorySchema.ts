export const sqliteMemorySchemaSql = `
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
`;
