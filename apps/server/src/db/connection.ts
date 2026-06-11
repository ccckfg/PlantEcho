import { env } from "../config/env.js";
import { openPostgresDatabase } from "./postgres/connection.js";
import { openSqliteDatabase } from "./sqlite/connection.js";
import type { DatabaseClient } from "./types.js";

let db: DatabaseClient | null = null;

export const getDb = (): DatabaseClient => {
  if (db) return db;
  db = env.DB_PROVIDER === "postgres"
    ? openPostgresDatabase()
    : openSqliteDatabase(env.databasePath);
  return db;
};

export const closeDb = async (): Promise<void> => {
  await db?.close();
  db = null;
};

export const usingPostgres = (): boolean => getDb().provider === "postgres";
