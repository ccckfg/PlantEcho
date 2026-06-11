import { randomUUID } from "node:crypto";
import type { CareRecord, CareRecordSource, CareRecordType } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import type { DatabaseClient } from "../../db/types.js";
import { nowIso } from "../../shared/time.js";

type CareRecordRow = {
  id: string;
  plant_id: string;
  type: string;
  note: string;
  source: string;
  performed_at: string;
  created_at: string;
};

const toCareRecord = (row: CareRecordRow): CareRecord => ({
  id: row.id,
  plantId: row.plant_id,
  type: row.type as CareRecordType,
  note: row.note,
  source: row.source as CareRecordSource,
  performedAt: row.performed_at,
  createdAt: row.created_at
});

export interface InsertCareRecordInput {
  plantId: string;
  type: CareRecordType;
  note: string;
  source: CareRecordSource;
  performedAt: string;
}

export const insertCareRecord = (input: InsertCareRecordInput): Promise<CareRecord> => {
  const db = getDb();
  const id = randomUUID();
  const createdAt = nowIso();
  return db.transaction(async (tx) => {
    await tx.prepare(
      `INSERT INTO care_records (id, plant_id, type, note, source, performed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.plantId, input.type, input.note, input.source, input.performedAt, createdAt);
    return (await getCareRecordWithDb(tx, id))!;
  });
};

const getCareRecordWithDb = async (
  db: DatabaseClient,
  id: string
): Promise<CareRecord | null> => {
  const row = await db.prepare("SELECT * FROM care_records WHERE id = ?").get<CareRecordRow>(id);
  return row ? toCareRecord(row) : null;
};

export const listCareRecords = async (plantId: string, limit = 50): Promise<CareRecord[]> => {
  const rows = await getDb()
    .prepare(
      "SELECT * FROM care_records WHERE plant_id = ? ORDER BY performed_at DESC, id DESC LIMIT ?"
    )
    .all<CareRecordRow>(plantId, limit);
  return rows.map(toCareRecord);
};
