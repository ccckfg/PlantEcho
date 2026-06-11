export type QueryParam = string | number | boolean | null | Buffer;

export interface RunResult {
  changes: number;
  lastInsertRowid?: number | string;
}

export interface PreparedStatement {
  get<T = unknown>(...params: QueryParam[]): Promise<T | undefined>;
  all<T = unknown>(...params: QueryParam[]): Promise<T[]>;
  run(...params: QueryParam[]): Promise<RunResult>;
}

export interface DatabaseClient {
  provider: "sqlite" | "postgres";
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (db: DatabaseClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
