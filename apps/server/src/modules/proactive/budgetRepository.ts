import { getDb } from "../../db/connection.js";
import type { DatabaseClient } from "../../db/types.js";
import { nowIso } from "../../shared/time.js";

export type Talkativeness = "quiet" | "moderate" | "active";

type BudgetRow = { tokens: number; last_refill_at: string };

export const getPlantBudgetIdentity = async (plantId: string): Promise<{
  scopeId: string;
  userId: string | null;
  talkativeness: Talkativeness | null;
}> => {
  const row = await getDb().prepare(
    `SELECT p.user_id, pref.talkativeness
     FROM plants p
     LEFT JOIN user_proactive_preferences pref ON pref.user_id = p.user_id
     WHERE p.id = ?`
  ).get<{ user_id: string | null; talkativeness: Talkativeness | null }>(plantId);
  return {
    scopeId: row?.user_id ? `user:${row.user_id}` : `plant:${plantId}`,
    userId: row?.user_id ?? null,
    talkativeness: row?.talkativeness ?? null
  };
};

export const getUserTalkativeness = async (userId: string): Promise<Talkativeness | null> => {
  const row = await getDb().prepare(
    "SELECT talkativeness FROM user_proactive_preferences WHERE user_id = ?"
  ).get<{ talkativeness: Talkativeness }>(userId);
  return row?.talkativeness ?? null;
};

export const setUserTalkativeness = async (
  userId: string,
  talkativeness: Talkativeness
): Promise<void> => {
  await getDb().prepare(
    `INSERT INTO user_proactive_preferences (user_id, talkativeness, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       talkativeness = excluded.talkativeness,
       updated_at = excluded.updated_at`
  ).run(userId, talkativeness, nowIso());
};

const refill = (row: BudgetRow | undefined, capacity: number, windowMs: number, now: Date): number => {
  if (!row) return capacity;
  const elapsed = Math.max(0, now.getTime() - new Date(row.last_refill_at).getTime());
  return Math.min(capacity, Number(row.tokens) + elapsed * capacity / windowMs);
};

const readLocked = async (db: DatabaseClient, scopeId: string): Promise<BudgetRow | undefined> => {
  const lock = db.provider === "postgres" ? " FOR UPDATE" : "";
  return db.prepare(
    `SELECT tokens, last_refill_at FROM proactive_budget_state WHERE scope_id = ?${lock}`
  ).get<BudgetRow>(scopeId);
};

const writeBudget = async (
  db: DatabaseClient,
  scopeId: string,
  tokens: number,
  now: Date
): Promise<void> => {
  const text = now.toISOString();
  await db.prepare(
    `INSERT INTO proactive_budget_state (scope_id, tokens, last_refill_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(scope_id) DO UPDATE SET
       tokens = excluded.tokens,
       last_refill_at = excluded.last_refill_at,
       updated_at = excluded.updated_at`
  ).run(scopeId, tokens, text, text);
};

export const inspectBudget = async (
  scopeId: string,
  capacity: number,
  windowMs: number,
  now = new Date()
): Promise<number> => getDb().transaction(async (db) => {
  const tokens = refill(await readLocked(db, scopeId), capacity, windowMs, now);
  await writeBudget(db, scopeId, tokens, now);
  return tokens;
});

export const takeBudgetToken = async (
  scopeId: string,
  capacity: number,
  windowMs: number,
  now = new Date()
): Promise<boolean> => getDb().transaction(async (db) => {
  const available = refill(await readLocked(db, scopeId), capacity, windowMs, now);
  await writeBudget(db, scopeId, available >= 1 ? available - 1 : available, now);
  return available >= 1;
});

export const returnBudgetToken = async (
  scopeId: string,
  capacity: number,
  windowMs: number,
  now = new Date()
): Promise<void> => {
  await getDb().transaction(async (db) => {
    const available = refill(await readLocked(db, scopeId), capacity, windowMs, now);
    await writeBudget(db, scopeId, Math.min(capacity, available + 1), now);
  });
};
