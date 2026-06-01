import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { load as loadSqliteVec } from "sqlite-vec";
import { env } from "../config/env.js";

let db: DatabaseSync | null = null;

export const getDb = (): DatabaseSync => {
  if (db) return db;
  fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });
  db = new DatabaseSync(env.databasePath, { allowExtension: true });
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  loadSqliteVec(db);
  return db;
};

export const closeDb = (): void => {
  db?.close();
  db = null;
};
