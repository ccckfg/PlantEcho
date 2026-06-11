import { getDb } from "../../../db/connection.js";
import { vectorLiteral } from "../../../db/postgres/sql.js";
import { embedTexts, embeddingConfig } from "../../llm/embeddingClient.js";
import type { EpisodeMemory, Understanding } from "../domain/types.js";
import { listEpisodeMemories, listUnderstandings } from "../repositories/memoryRepository.js";

type TargetType = "episode" | "understanding";

export interface VectorCandidate {
  targetType: TargetType;
  targetId: string;
  distance: number;
  indexText: string;
}

const vecTableExists = async (): Promise<boolean> => {
  const db = getDb();
  const row = db.provider === "postgres"
    ? await db.prepare("SELECT to_regclass('public.memory_vectors') AS name").get<{ name: string | null }>()
    : await db.prepare("SELECT name FROM sqlite_master WHERE name = 'memory_vectors'").get<{ name: string }>();
  return Boolean(row?.name);
};

const createVecTable = async (dimension: number): Promise<void> => {
  const db = getDb();
  if (db.provider === "postgres") return;
  if (await vecTableExists()) return;
  await db.exec(`CREATE VIRTUAL TABLE memory_vectors USING vec0(embedding float[${dimension}])`);
};

const resetVectorIndex = async (): Promise<void> => {
  const db = getDb();
  if (db.provider === "postgres") {
    await db.exec("DELETE FROM vector_index_items;");
    return;
  }
  await db.exec(`
DROP TABLE IF EXISTS memory_vectors;
DELETE FROM vector_index_items;
`);
};

const resetVectorIndexIfConfigChanged = async (dimension: number): Promise<void> => {
  const config = embeddingConfig();
  const row = await getDb().prepare(
    `SELECT embedding_provider, embedding_model, embedding_dim
     FROM vector_index_items
     WHERE embedding_provider IS NOT NULL OR embedding_model IS NOT NULL OR embedding_dim IS NOT NULL
     LIMIT 1`
  ).get<{
    embedding_provider: string | null;
    embedding_model: string | null;
    embedding_dim: number | null;
  }>();
  if (!row) return;
  if (row.embedding_provider !== config.provider ||
      row.embedding_model !== config.model ||
      row.embedding_dim !== dimension) {
    await resetVectorIndex();
  }
};

const indexTextForEpisode = (memory: EpisodeMemory): string => {
  const meta = [memory.date, memory.time, memory.title, memory.keywords.join(" ")].join(" ");
  return [meta, memory.content].filter(Boolean).join("\n");
};

const indexTextForUnderstanding = (understanding: Understanding): string => {
  return [understanding.subject, understanding.keywords.join(" "), understanding.content]
    .filter(Boolean)
    .join("\n");
};

const getVectorItemId = async (
  targetType: TargetType,
  targetId: string,
  plantId: string,
  indexText: string,
  dimension: number
): Promise<number> => {
  const db = getDb();
  const config = embeddingConfig();
  const existing = await db.prepare(
    "SELECT id, index_text FROM vector_index_items WHERE target_type = ? AND target_id = ?"
  ).get<{ id: number; index_text: string }>(targetType, targetId);
  if (existing) {
    if (existing.index_text !== indexText) {
      await db.prepare(
        `UPDATE vector_index_items
         SET plant_id = ?, index_text = ?, embedding_provider = ?,
             embedding_model = ?, embedding_dim = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        plantId,
        indexText,
        config.provider,
        config.model,
        dimension,
        new Date().toISOString(),
        existing.id
      );
      await db.prepare(
        db.provider === "postgres"
          ? "DELETE FROM memory_vectors WHERE item_id = ?"
          : "DELETE FROM memory_vectors WHERE rowid = ?"
      ).run(existing.id);
    }
    return existing.id;
  }
  const result = await db.prepare(
    `INSERT INTO vector_index_items
     (target_type, target_id, plant_id, index_text, embedding_provider,
      embedding_model, embedding_dim, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).run(
    targetType,
    targetId,
    plantId,
    indexText,
    config.provider,
    config.model,
    dimension,
    new Date().toISOString()
  );
  return Number(result.lastInsertRowid);
};

const insertVector = async (rowId: number, embedding: number[]): Promise<void> => {
  const safeRowId = Math.trunc(rowId);
  const db = getDb();
  if (db.provider === "postgres") {
    await db.prepare(
      `INSERT INTO memory_vectors(item_id, embedding)
       VALUES (?, ?::vector)
       ON CONFLICT(item_id) DO UPDATE SET embedding = excluded.embedding`
    ).run(safeRowId, vectorLiteral(embedding));
    return;
  }
  await db.prepare(`INSERT OR REPLACE INTO memory_vectors(rowid, embedding) VALUES (${safeRowId}, ?)`)
    .run(JSON.stringify(embedding));
};

const missingVectorTargets = async (plantId: string): Promise<Array<{
  targetType: TargetType;
  targetId: string;
  indexText: string;
}>> => {
  const episodes = (await listEpisodeMemories(plantId, 500)).map((memory) => ({
    targetType: "episode" as const,
    targetId: memory.id,
    indexText: indexTextForEpisode(memory)
  }));
  const understandings = (await listUnderstandings(plantId)).map((understanding) => ({
    targetType: "understanding" as const,
    targetId: understanding.id,
    indexText: indexTextForUnderstanding(understanding)
  }));
  const rows = await getDb().prepare(
    "SELECT target_type, target_id, index_text FROM vector_index_items WHERE plant_id = ?"
  ).all<{ target_type: TargetType; target_id: string; index_text: string }>(plantId);
  const existing = new Map(rows.map((row) => [`${row.target_type}:${row.target_id}`, row.index_text]));
  return [...episodes, ...understandings].filter((item) => {
    return existing.get(`${item.targetType}:${item.targetId}`) !== item.indexText;
  });
};

export const ensureVectorIndexForPlant = async (plantId: string): Promise<boolean> => {
  const targets = await missingVectorTargets(plantId);
  if (!targets.length) return vecTableExists();
  const embeddings = await embedTexts(targets.map((item) => item.indexText));
  if (!embeddings?.length) return false;
  await resetVectorIndexIfConfigChanged(embeddings[0]!.length);
  await createVecTable(embeddings[0]!.length);
  for (const [index, target] of targets.entries()) {
    const embedding = embeddings[index];
    if (!embedding?.length) continue;
    const rowId = await getVectorItemId(
      target.targetType,
      target.targetId,
      plantId,
      target.indexText,
      embedding.length
    );
    await insertVector(rowId, embedding);
  }
  return true;
};

export const getVectorCandidates = async (
  plantId: string,
  targetType: TargetType,
  query: string,
  limit: number
): Promise<VectorCandidate[]> => {
  if (!await vecTableExists()) return [];
  const embedding = (await embedTexts([query]))?.[0];
  if (!embedding?.length) return [];
  const candidateLimit = Math.max(limit * 10, 50);
  const db = getDb();
  if (db.provider === "postgres") {
    const literal = vectorLiteral(embedding);
    const rows = await db.prepare(
      `SELECT i.target_type, i.target_id, i.index_text, (v.embedding <-> ?::vector) AS distance
       FROM memory_vectors v
       JOIN vector_index_items i ON i.id = v.item_id
       WHERE i.plant_id = ? AND i.target_type = ?
       ORDER BY v.embedding <-> ?::vector
       LIMIT ?`
    ).all<{
      target_type: TargetType;
      target_id: string;
      index_text: string;
      distance: number;
    }>(literal, plantId, targetType, literal, limit);
    return rows.map((row) => ({
      targetType: row.target_type,
      targetId: row.target_id,
      indexText: row.index_text,
      distance: row.distance
    }));
  }
  const rows = await db.prepare(
    `WITH vec_results AS (
       SELECT rowid, distance
       FROM memory_vectors
       WHERE embedding MATCH ?
       ORDER BY distance
       LIMIT ?
     )
     SELECT i.target_type, i.target_id, i.index_text, v.distance
     FROM vec_results v
     JOIN vector_index_items i ON i.id = v.rowid
     WHERE i.plant_id = ? AND i.target_type = ?
     ORDER BY v.distance
     LIMIT ?`
  ).all<{
    target_type: TargetType;
    target_id: string;
    index_text: string;
    distance: number;
  }>(JSON.stringify(embedding), candidateLimit, plantId, targetType, limit);
  return rows.map((row) => ({
    targetType: row.target_type,
    targetId: row.target_id,
    indexText: row.index_text,
    distance: row.distance
  }));
};
