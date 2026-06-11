import { env } from "../config/env.js";
import { defaultCareProfile } from "../config/careProfiles.js";
import { getDb } from "./connection.js";
import { latestSchemaVersion, migrations, type DatabaseMigration } from "./migrations/index.js";
import { rebuildFtsIndexes } from "../modules/memory/repositories/memorySearchRepository.js";
import { applyPostgresMigrations, seedPostgresDemoData } from "./postgres/migrate.js";

export const migrate = async (): Promise<void> => {
  const db = getDb();
  if (db.provider === "postgres") {
    await applyPostgresMigrations(db);
    await seedPostgresDemoData(db);
    return;
  }
  await applyMigrations();
  await seedDemoData();
  await rebuildFtsIndexes();
};

const ensureMigrationTable = async (): Promise<void> => {
  await getDb().exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`);
};

const appliedVersions = async (): Promise<Set<number>> => {
  const rows = await getDb()
    .prepare("SELECT version FROM schema_migrations")
    .all<{ version: number }>();
  return new Set(rows.map((row) => row.version));
};

const assertMigrationOrder = (): void => {
  const seen = new Set<number>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }
    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    seen.add(migration.version);
  }
};

const runMigration = async (migration: DatabaseMigration): Promise<void> => {
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.exec(migration.up);
    await tx.prepare(
      "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)"
    ).run(migration.version, migration.name, now);
  });
};

export const applyMigrations = async (): Promise<void> => {
  assertMigrationOrder();
  await ensureMigrationTable();
  const applied = await appliedVersions();
  for (const migration of migrations) {
    if (!applied.has(migration.version)) {
      await runMigration(migration);
    }
  }
  const current = Math.max(0, ...(await appliedVersions()));
  if (current !== latestSchemaVersion) {
    throw new Error(`Database schema version ${current} does not match ${latestSchemaVersion}`);
  }
};

const seedDemoData = async (): Promise<void> => {
  const db = getDb();
  const now = new Date().toISOString();
  const plant = await db.prepare("SELECT id FROM plants WHERE id = ?").get(env.DEFAULT_PLANT_ID);
  if (!plant) {
    await db.prepare(
      `INSERT INTO plants
       (id, name, species, persona_profile_id, avatar_url, location,
        care_profile_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      env.DEFAULT_PLANT_ID,
      "小绿",
      "绿萝",
      "pothos",
      null,
      "书桌旁",
      JSON.stringify(defaultCareProfile),
      now,
      now
    );
  }
  await db.prepare(
    `INSERT OR IGNORE INTO plant_inner_state
     (plant_id, mood, concern, thought, source_turn, updated_at)
     VALUES (?, '平静', '', '', NULL, ?)`
  ).run(env.DEFAULT_PLANT_ID, now);
  await db.prepare(
    `INSERT OR IGNORE INTO plant_relationship_state
     (plant_id, stage, summary, evidence_memory_ids_json, updated_at)
     VALUES (?, '初识', '刚开始熟悉主人', '[]', ?)`
  ).run(env.DEFAULT_PLANT_ID, now);
  const device = await db.prepare("SELECT id FROM devices WHERE id = ?").get(env.DEFAULT_DEVICE_ID);
  if (!device) {
    await db.prepare(
      "INSERT INTO devices (id, plant_id, name, api_key_hash, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(env.DEFAULT_DEVICE_ID, env.DEFAULT_PLANT_ID, "ESP32 Demo", null, null, now);
  }
};
