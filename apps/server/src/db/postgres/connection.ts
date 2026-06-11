import pg from "pg";
import { env } from "../../config/env.js";
import type { DatabaseClient, PreparedStatement, QueryParam, RunResult } from "../types.js";
import { bindPostgresParams, normalizeParams } from "./sql.js";

type Queryable = pg.Pool | pg.PoolClient;

const maybeReturningId = (rows: unknown[]): number | string | undefined => {
  const first = rows[0];
  if (!first || typeof first !== "object") return undefined;
  const id = (first as { id?: unknown }).id;
  if (typeof id === "number" || typeof id === "string") return id;
  return undefined;
};

class PostgresDatabaseClient implements DatabaseClient {
  readonly provider = "postgres" as const;

  constructor(
    private readonly pool: pg.Pool,
    private readonly queryable: Queryable = pool,
    private readonly ownsPool = false
  ) {}

  prepare(sql: string): PreparedStatement {
    const text = bindPostgresParams(sql);
    return {
      get: async <T = unknown>(...params: QueryParam[]) => {
        const result = await this.queryable.query(text, normalizeParams(params));
        return result.rows[0] as T | undefined;
      },
      all: async <T = unknown>(...params: QueryParam[]) => {
        const result = await this.queryable.query(text, normalizeParams(params));
        return result.rows as T[];
      },
      run: async (...params: QueryParam[]): Promise<RunResult> => {
        const result = await this.queryable.query(text, normalizeParams(params));
        return {
          changes: result.rowCount ?? 0,
          lastInsertRowid: maybeReturningId(result.rows)
        };
      }
    };
  }

  async exec(sql: string): Promise<void> {
    await this.queryable.query(sql);
  }

  async transaction<T>(callback: (db: DatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const tx = new PostgresDatabaseClient(this.pool, client);
    try {
      await client.query("BEGIN");
      const result = await callback(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}

export const openPostgresDatabase = (): DatabaseClient => {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DB_PROVIDER=postgres");
  }
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS
  });
  return new PostgresDatabaseClient(pool, pool, true);
};
