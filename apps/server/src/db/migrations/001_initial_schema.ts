import { schemaSql } from "../schema.js";
import type { DatabaseMigration } from "./index.js";

export const initialSchemaMigration: DatabaseMigration = {
  version: 1,
  name: "initial_schema",
  up: schemaSql
};
