import type { DatabaseMigration } from "./index.js";

export const proactiveAlivenessP0Migration: DatabaseMigration = {
  version: 20,
  name: "proactive_aliveness_p0",
  up: `
ALTER TABLE users ADD COLUMN timezone TEXT;

ALTER TABLE plant_intentions ADD COLUMN keep_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE proactive_reminders ADD COLUMN claim_token TEXT;
ALTER TABLE proactive_reminders ADD COLUMN claim_expires_at TEXT;
ALTER TABLE proactive_reminders ADD COLUMN message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS proactive_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  intention_id TEXT REFERENCES plant_intentions(id) ON DELETE SET NULL,
  considered_at TEXT NOT NULL,
  gate_result TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_detail TEXT NOT NULL DEFAULT '',
  llm_action TEXT,
  llm_reason TEXT,
  llm_tokens INTEGER,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  user_reaction TEXT,
  reaction_latency_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_proactive_decisions_plant_time
  ON proactive_decisions(plant_id, considered_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_decisions_intention
  ON proactive_decisions(intention_id, considered_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentions_ready
  ON plant_intentions(plant_id, status, not_before, priority DESC, created_at ASC);

DROP TABLE IF EXISTS proactive_observation_state;
`
};
