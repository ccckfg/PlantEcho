import type { DatabaseMigration } from "./index.js";

export const deviceConfigDeliveryQueueMigration: DatabaseMigration = {
  version: 9,
  name: "device_config_delivery_queue",
  up: `
CREATE TABLE IF NOT EXISTS device_config_deliveries (
  device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_config_deliveries_updated
  ON device_config_deliveries(updated_at);
`
};
