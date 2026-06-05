import type { DatabaseMigration } from "./index.js";

export const plantBackgroundInfoMigration: DatabaseMigration = {
  version: 11,
  name: "plant_background_info",
  up: `
ALTER TABLE plants ADD COLUMN background_info TEXT NOT NULL DEFAULT '';
`
};
