import type { DatabaseMigration } from "./index.js";

export const plantUserOwnershipMigration: DatabaseMigration = {
  version: 19,
  name: "plant_user_ownership",
  up: `
ALTER TABLE plants ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE plants
SET user_id = (
  SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1
)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM users);

CREATE INDEX IF NOT EXISTS idx_plants_user_status_created
  ON plants(user_id, status, created_at DESC);
`
};
