import type { DatabaseMigration } from "./index.js";

export const pendingDeviceUserIdMigration: DatabaseMigration = {
  version: 8,
  name: "pending_device_user_id",
  up: `
ALTER TABLE pending_devices ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pending_devices_user_status
  ON pending_devices(user_id, claim_status, last_seen_at DESC);
`
};
