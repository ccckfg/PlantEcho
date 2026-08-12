import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

export interface BodyState {
  plantId: string;
  metric: string;
  ewmaValue: number;
  conditionCode: string | null;
  abnormalSince: string | null;
  lastObservedAt: string;
  updatedAt: string;
}

type BodyStateRow = {
  plant_id: string;
  metric: string;
  ewma_value: number;
  condition_code: string | null;
  abnormal_since: string | null;
  last_observed_at: string;
  updated_at: string;
};

const toBodyState = (row: BodyStateRow): BodyState => ({
  plantId: row.plant_id,
  metric: row.metric,
  ewmaValue: row.ewma_value,
  conditionCode: row.condition_code,
  abnormalSince: row.abnormal_since,
  lastObservedAt: row.last_observed_at,
  updatedAt: row.updated_at
});

type NextBodyState = Pick<
  BodyState,
  "ewmaValue" | "conditionCode" | "abnormalSince" | "lastObservedAt"
>;

export const getBodyState = async (
  plantId: string,
  metric: string
): Promise<BodyState | null> => {
  const row = await getDb().prepare(
    "SELECT * FROM proactive_body_state WHERE plant_id = ? AND metric = ?"
  ).get<BodyStateRow>(plantId, metric);
  return row ? toBodyState(row) : null;
};

export const mutateBodyState = async (
  plantId: string,
  metric: string,
  reducer: (current: BodyState | null) => NextBodyState | null
): Promise<BodyState | null> => {
  return getDb().transaction(async (db) => {
    const lockClause = db.provider === "postgres" ? " FOR UPDATE" : "";
    if (db.provider === "postgres") {
      await db.prepare("SELECT id FROM plants WHERE id = ? FOR UPDATE").get(plantId);
    }
    const row = await db.prepare(
      `SELECT * FROM proactive_body_state
       WHERE plant_id = ? AND metric = ?${lockClause}`
    ).get<BodyStateRow>(plantId, metric);
    const current = row ? toBodyState(row) : null;
    const next = reducer(current);
    if (!next) return current;
    const updatedAt = nowIso();
    await db.prepare(
      `INSERT INTO proactive_body_state
       (plant_id, metric, ewma_value, condition_code, abnormal_since,
        last_observed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(plant_id, metric) DO UPDATE SET
         ewma_value = excluded.ewma_value,
         condition_code = excluded.condition_code,
         abnormal_since = excluded.abnormal_since,
         last_observed_at = excluded.last_observed_at,
         updated_at = excluded.updated_at`
    ).run(
      plantId,
      metric,
      next.ewmaValue,
      next.conditionCode,
      next.abnormalSince,
      next.lastObservedAt,
      updatedAt
    );
    return {
      plantId,
      metric,
      ...next,
      updatedAt
    };
  });
};
