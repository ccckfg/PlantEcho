export const sqliteIndexSchemaSql = `
CREATE INDEX IF NOT EXISTS idx_readings_plant_time
  ON sensor_readings(plant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_created
  ON sensor_readings(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_devices_status
  ON pending_devices(claim_status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_devices_cleanup
  ON pending_devices(claim_status, last_seen_at);
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
CREATE INDEX IF NOT EXISTS idx_drafts_consumed_at
  ON memory_drafts(consumed_at);
CREATE INDEX IF NOT EXISTS idx_vector_index_target
  ON vector_index_items(target_type, target_id);
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
`;
