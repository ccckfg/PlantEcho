import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";
import pg from "pg";
import { load as loadSqliteVec } from "sqlite-vec";
import { latestSchemaVersion } from "../src/db/migrations/index.js";
import { postgresIndexSql, postgresRuntimeSchemaSql } from "../src/db/postgres/runtimeSchema.js";
import { postgresSchemaSql } from "../src/db/postgres/schema.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const TABLES = [
  "plants",
  "users",
  "devices",
  "auth_sessions",
  "user_api_keys",
  "pending_devices",
  "device_config_deliveries",
  "sensor_readings",
  "plant_status",
  "messages",
  "plant_turn_counters",
  "plant_photos",
  "memory_drafts",
  "memory_consolidation_state",
  "background_jobs",
  "sync_events",
  "plant_memories",
  "plant_understandings",
  "vector_index_items",
  "memory_vectors",
  "history_window_state",
  "proactive_event_log",
  "proactive_reminders",
  "plant_inner_state",
  "plant_relationship_state",
  "plant_intentions",
  "plant_status_tags",
  "llm_usage_logs",
  "care_records",
  "proactive_decisions",
  "user_proactive_preferences",
  "proactive_budget_state",
  "proactive_body_state"
];

const SERIAL_TABLES = [
  "sensor_readings",
  "messages",
  "memory_drafts",
  "sync_events",
  "vector_index_items",
  "proactive_event_log",
  "llm_usage_logs",
  "proactive_decisions"
];

const args = new Map(
  process.argv.slice(2).flatMap((item, index, all) => {
    if (!item.startsWith("--")) return [];
    const [key, inlineValue] = item.split("=", 2);
    const next = all[index + 1];
    const value = inlineValue ?? (next && !next.startsWith("--") ? next : "true");
    return [[key, value]];
  })
);

const sqlitePath = path.resolve(
  repoRoot,
  args.get("--sqlite") ?? process.env.SQLITE_PATH ?? "apps/server/data/dyn.sqlite"
);
const databaseUrl =
  args.get("--database-url") ??
  process.env.DATABASE_URL ??
  "postgresql://dyn:dyn-local-password@127.0.0.1:5432/dyn";
const resetTarget = args.has("--reset-target");

const quoteIdent = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const vectorLiteralFromBuffer = (value: unknown): unknown => {
  if (!ArrayBuffer.isView(value)) return value;
  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (bytes.byteLength % 4 !== 0) return value;
  const floats = Array.from(new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4));
  return `[${floats.join(",")}]`;
};

const sqliteTables = (db: DatabaseSync): Set<string> =>
  new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String((row as { name: string }).name))
  );

const sqliteColumns = (db: DatabaseSync, table: string): string[] =>
  db.prepare(`PRAGMA table_info(${quoteIdent(table)})`)
    .all()
    .map((row) => String((row as { name: string }).name));

const postgresColumns = async (pool: pg.Pool, table: string): Promise<string[]> => {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND is_generated = 'NEVER'
     ORDER BY ordinal_position`,
    [table]
  );
  return result.rows.map((row) => row.column_name);
};

const rowsForTable = (db: DatabaseSync, table: string): Record<string, unknown>[] =>
  db.prepare(`SELECT * FROM ${quoteIdent(table)}`).all() as Record<string, unknown>[];

const applySchema = async (pool: pg.Pool): Promise<void> => {
  if (resetTarget) {
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("CREATE SCHEMA public");
  }
  await pool.query(postgresSchemaSql);
  await pool.query(postgresRuntimeSchemaSql);
  await pool.query(postgresIndexSql);
  await pool.query(
    `INSERT INTO schema_migrations (version, name, applied_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(version) DO UPDATE SET name = excluded.name, applied_at = excluded.applied_at`,
    [latestSchemaVersion, "postgres_initial_pgvector_schema", new Date().toISOString()]
  );
};

const copyTable = async (
  sqlite: DatabaseSync,
  pool: pg.Pool,
  table: string,
  availableTables: Set<string>
): Promise<number> => {
  if (!availableTables.has(table)) return 0;
  const sourceColumns = new Set(sqliteColumns(sqlite, table));
  const columns = (await postgresColumns(pool, table)).filter((column) =>
    sourceColumns.has(column) || (table === "memory_vectors" && column === "item_id" && sourceColumns.has("rowid"))
  );
  if (!columns.length) return 0;

  const rows = rowsForTable(sqlite, table);
  if (!rows.length) return 0;

  const columnSql = columns.map(quoteIdent).join(", ");
  const placeholderSql = columns.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `INSERT INTO ${quoteIdent(table)} (${columnSql}) VALUES (${placeholderSql})`;

  for (const row of rows) {
    const values = columns.map((column) => {
      const value = table === "memory_vectors" && column === "item_id" ? row.rowid : row[column];
      return table === "memory_vectors" && column === "embedding"
        ? vectorLiteralFromBuffer(value)
        : value;
    });
    await pool.query(sql, values);
  }
  return rows.length;
};

const resetSequences = async (pool: pg.Pool): Promise<void> => {
  for (const table of SERIAL_TABLES) {
    await pool.query(
      `SELECT setval(
        pg_get_serial_sequence($1, 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 1), 1),
        COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}) IS NOT NULL, false)
      )`,
      [table]
    );
  }
};

if (!fs.existsSync(sqlitePath)) {
  throw new Error(`SQLite database not found: ${sqlitePath}`);
}

const sqlite = new DatabaseSync(sqlitePath, { allowExtension: true, readOnly: true });
loadSqliteVec(sqlite);
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  await applySchema(pool);
  const availableTables = sqliteTables(sqlite);
  const imported: Record<string, number> = {};
  for (const table of TABLES) {
    imported[table] = await copyTable(sqlite, pool, table, availableTables);
  }
  await resetSequences(pool);
  console.log(JSON.stringify({ sqlitePath, databaseUrl, resetTarget, imported }, null, 2));
} finally {
  sqlite.close();
  await pool.end();
}
