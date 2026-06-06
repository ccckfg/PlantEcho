import type { DatabaseMigration } from "./index.js";

export const intentionAttemptBackoffMigration: DatabaseMigration = {
  version: 14,
  name: "intention_attempt_backoff",
  up: `
ALTER TABLE plant_intentions ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_intentions ADD COLUMN last_attempt_at TEXT;
`
};
