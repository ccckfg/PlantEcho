import { defaultCareProfile } from "../../config/careProfiles.js";
import { env } from "../../config/env.js";
import type { DatabaseClient } from "../types.js";
import { latestSchemaVersion } from "../migrations/index.js";
import { postgresRuntimeSchemaSql, postgresIndexSql } from "./runtimeSchema.js";
import { postgresSchemaSql } from "./schema.js";

const migrationName = "postgres_initial_pgvector_schema";
const postgresOwnershipMigrationSql = `
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE plants
SET user_id = (
  SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1
)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM users);
`;

const postgresProactiveP0MigrationSql = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE plant_intentions ADD COLUMN IF NOT EXISTS keep_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE proactive_reminders ADD COLUMN IF NOT EXISTS claim_token TEXT;
ALTER TABLE proactive_reminders ADD COLUMN IF NOT EXISTS claim_expires_at TEXT;
ALTER TABLE proactive_reminders ADD COLUMN IF NOT EXISTS message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE proactive_decisions ADD COLUMN IF NOT EXISTS user_reaction TEXT;
ALTER TABLE proactive_decisions ADD COLUMN IF NOT EXISTS reaction_latency_ms INTEGER;
DROP TABLE IF EXISTS proactive_observation_state;
`;

const markSchemaVersion = async (db: DatabaseClient): Promise<void> => {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO schema_migrations (version, name, applied_at)
     VALUES (?, ?, ?)
     ON CONFLICT(version) DO UPDATE SET name = excluded.name`
  ).run(latestSchemaVersion, migrationName, now);
};

export const applyPostgresMigrations = async (db: DatabaseClient): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.exec(postgresSchemaSql);
    await tx.exec(postgresOwnershipMigrationSql);
    await tx.exec(postgresRuntimeSchemaSql);
    await tx.exec(postgresProactiveP0MigrationSql);
    await tx.exec(postgresIndexSql);
    await markSchemaVersion(tx);
  });
};

export const seedPostgresDemoData = async (db: DatabaseClient): Promise<void> => {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.prepare(
      `INSERT INTO plants
       (id, user_id, name, species, persona_profile_id, avatar_url, location,
        care_profile_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    ).run(
      env.DEFAULT_PLANT_ID,
      null,
      "小绿",
      "绿萝",
      "pothos",
      null,
      "书桌旁",
      JSON.stringify(defaultCareProfile),
      now,
      now
    );
    await tx.prepare(
      `INSERT INTO plant_inner_state
       (plant_id, mood, concern, thought, source_turn, updated_at)
       VALUES (?, '平静', '', '', NULL, ?)
       ON CONFLICT(plant_id) DO NOTHING`
    ).run(env.DEFAULT_PLANT_ID, now);
    await tx.prepare(
      `INSERT INTO plant_relationship_state
       (plant_id, stage, summary, evidence_memory_ids_json, updated_at)
       VALUES (?, '初识', '刚开始熟悉主人', '[]', ?)
       ON CONFLICT(plant_id) DO NOTHING`
    ).run(env.DEFAULT_PLANT_ID, now);
    await tx.prepare(
      `INSERT INTO devices (id, plant_id, name, api_key_hash, last_seen_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    ).run(env.DEFAULT_DEVICE_ID, env.DEFAULT_PLANT_ID, "ESP32 Demo", null, null, now);
  });
};
