import { env } from "../config/env.js";
import { defaultCareProfile } from "../config/careProfiles.js";
import { getDb } from "./connection.js";
import { latestSchemaVersion, migrations, type DatabaseMigration } from "./migrations/index.js";
import { rebuildFtsIndexes } from "../modules/memory/repositories/memorySearchRepository.js";

export const migrate = (): void => {
  const db = getDb();
  applyMigrations();
  seedDemoData();
  rebuildFtsIndexes();
};

const ensureMigrationTable = (): void => {
  getDb().exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`);
};

const appliedVersions = (): Set<number> => {
  const rows = getDb()
    .prepare("SELECT version FROM schema_migrations")
    .all() as { version: number }[];
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

const runMigration = (migration: DatabaseMigration): void => {
  const db = getDb();
  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    db.exec(migration.up);
    db.prepare(
      "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)"
    ).run(migration.version, migration.name, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

export const applyMigrations = (): void => {
  assertMigrationOrder();
  ensureMigrationTable();
  const applied = appliedVersions();
  for (const migration of migrations) {
    if (!applied.has(migration.version)) {
      runMigration(migration);
    }
  }
  const current = Math.max(0, ...appliedVersions());
  if (current !== latestSchemaVersion) {
    throw new Error(`Database schema version ${current} does not match ${latestSchemaVersion}`);
  }
};

const seedDemoData = (): void => {
  const db = getDb();
  const now = new Date().toISOString();
  const plant = db.prepare("SELECT id FROM plants WHERE id = ?").get(env.DEFAULT_PLANT_ID);
  if (!plant) {
    db.prepare(
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
  const status = db.prepare("SELECT plant_id FROM plant_status WHERE plant_id = ?").get(env.DEFAULT_PLANT_ID);
  if (!status) {
    db.prepare(
      `INSERT INTO plant_status
       (plant_id, mood, relationship, focus, last_summary, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(env.DEFAULT_PLANT_ID, "平静", "刚开始熟悉主人", "等待第一批真实传感器数据", "", now);
  }
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(env.DEFAULT_DEVICE_ID);
  if (!device) {
    db.prepare(
      "INSERT INTO devices (id, plant_id, name, api_key_hash, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(env.DEFAULT_DEVICE_ID, env.DEFAULT_PLANT_ID, "ESP32 Demo", null, null, now);
  }
};
