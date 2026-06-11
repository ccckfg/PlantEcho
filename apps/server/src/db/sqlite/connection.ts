import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { load as loadSqliteVec } from "sqlite-vec";
import type { DatabaseClient, PreparedStatement, QueryParam, RunResult } from "../types.js";

type SqliteParam = string | number | null | Buffer;

const normalizeSqliteParams = (params: QueryParam[]): SqliteParam[] =>
  params.map((value) => typeof value === "boolean" ? Number(value) : value);

export class SqliteDatabaseClient implements DatabaseClient {
  readonly provider = "sqlite" as const;
  private transactionQueue: Promise<void> = Promise.resolve();

  constructor(private readonly db: DatabaseSync) {}

  prepare(sql: string): PreparedStatement {
    const statement = this.db.prepare(sql);
    return {
      get: async <T = unknown>(...params: QueryParam[]) =>
        statement.get(...normalizeSqliteParams(params)) as T | undefined,
      all: async <T = unknown>(...params: QueryParam[]) =>
        statement.all(...normalizeSqliteParams(params)) as T[],
      run: async (...params: QueryParam[]): Promise<RunResult> => {
        const result = statement.run(...normalizeSqliteParams(params));
        return {
          changes: Number(result.changes),
          lastInsertRowid: Number(result.lastInsertRowid)
        };
      }
    };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async transaction<T>(callback: (db: DatabaseClient) => Promise<T>): Promise<T> {
    const run = this.transactionQueue.then(async () => {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const result = await callback(this);
        this.db.exec("COMMIT");
        return result;
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    });
    this.transactionQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export const openSqliteDatabase = (databasePath: string): DatabaseClient => {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath, { allowExtension: true });
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  loadSqliteVec(db);
  return new SqliteDatabaseClient(db);
};
