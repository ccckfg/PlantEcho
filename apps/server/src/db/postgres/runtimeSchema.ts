export const postgresRuntimeSchemaSql = `
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
  updated_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT
);

CREATE TABLE IF NOT EXISTS plant_status_tags (
  plant_id TEXT PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  tags_json TEXT NOT NULL,
  source_turn INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  phase TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  token_source TEXT NOT NULL,
  estimated_cost REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_vectors (
  item_id BIGINT PRIMARY KEY REFERENCES vector_index_items(id) ON DELETE CASCADE,
  embedding vector NOT NULL
);

CREATE TABLE IF NOT EXISTS care_records (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'panel',
  performed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const postgresIndexSql = `
CREATE INDEX IF NOT EXISTS idx_plants_status_created
  ON plants(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_status
  ON devices(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
  ON auth_sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token
  ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active
  ON auth_sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash
  ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_readings_plant_time
  ON sensor_readings(plant_id, captured_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_readings_created
  ON sensor_readings(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_devices_status
  ON pending_devices(claim_status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_devices_cleanup
  ON pending_devices(claim_status, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_pending_devices_user_status
  ON pending_devices(user_id, claim_status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_config_deliveries_updated
  ON device_config_deliveries(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_plant_turn
  ON messages(plant_id, turn DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_photos_plant_captured
  ON plant_photos(plant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_unconsumed
  ON memory_drafts(plant_id, consumed_at);
CREATE INDEX IF NOT EXISTS idx_drafts_consumed_at
  ON memory_drafts(consumed_at);
CREATE INDEX IF NOT EXISTS idx_memories_plant_created
  ON plant_memories(plant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_search
  ON plant_memories USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_understandings_search
  ON plant_understandings USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_vector_index_target
  ON vector_index_items(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_item
  ON memory_vectors(item_id);
CREATE INDEX IF NOT EXISTS idx_jobs_ready
  ON background_jobs(status, run_after, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_locked
  ON background_jobs(status, locked_at);
CREATE INDEX IF NOT EXISTS idx_jobs_cleanup
  ON background_jobs(status, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_active_dedupe
  ON background_jobs(dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS idx_sync_events_id
  ON sync_events(id);
CREATE INDEX IF NOT EXISTS idx_sync_events_created
  ON sync_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_plant
  ON sync_events(plant_id, id);
CREATE INDEX IF NOT EXISTS idx_proactive_event_key
  ON proactive_event_log(plant_id, event_key, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_event_fired
  ON proactive_event_log(fired_at);
CREATE INDEX IF NOT EXISTS idx_proactive_reminders_due
  ON proactive_reminders(status, remind_at);
CREATE INDEX IF NOT EXISTS idx_proactive_reminders_cleanup
  ON proactive_reminders(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_intentions_pending
  ON plant_intentions(plant_id, status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created
  ON llm_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_cleanup
  ON auth_sessions(revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_care_records_plant
  ON care_records(plant_id, performed_at DESC, id DESC);
`;
