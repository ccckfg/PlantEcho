import { sqliteCoreSchemaSql } from "./sqlite/coreSchema.js";
import { sqliteIndexSchemaSql } from "./sqlite/indexSchema.js";
import { sqliteMemorySchemaSql } from "./sqlite/memorySchema.js";
import { sqliteProactiveSchemaSql } from "./sqlite/proactiveSchema.js";

export const schemaSql = [
  sqliteCoreSchemaSql,
  sqliteMemorySchemaSql,
  sqliteProactiveSchemaSql,
  sqliteIndexSchemaSql
].join("\n");
