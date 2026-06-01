import { getDb } from "../../../db/connection.js";
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

const vecTableExists = (): boolean => {
  const row = getDb().prepare("SELECT name FROM sqlite_master WHERE name = 'memory_vectors'").get();
  return Boolean(row);
};

const createVecTable = (dimension: number): void => {
  if (vecTableExists()) return;
  getDb().exec(`CREATE VIRTUAL TABLE memory_vectors USING vec0(embedding float[${dimension}])`);
};

const resetVectorIndex = (): void => {
  getDb().exec(`
DROP TABLE IF EXISTS memory_vectors;
DELETE FROM vector_index_items;
`);
};

const resetVectorIndexIfConfigChanged = (dimension: number): void => {
  const config = embeddingConfig();
  const row = getDb().prepare(
    `SELECT embedding_provider, embedding_model, embedding_dim
     FROM vector_index_items
     WHERE embedding_provider IS NOT NULL OR embedding_model IS NOT NULL OR embedding_dim IS NOT NULL
     LIMIT 1`
  ).get() as {
    embedding_provider: string | null;
    embedding_model: string | null;
    embedding_dim: number | null;
  } | undefined;
  if (!row) return;
  if (row.embedding_provider !== config.provider ||
      row.embedding_model !== config.model ||
      row.embedding_dim !== dimension) {
    resetVectorIndex();
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

const getVectorItemId = (
  targetType: TargetType,
  targetId: string,
  plantId: string,
  indexText: string,
  dimension: number
): number => {
  const db = getDb();
  const config = embeddingConfig();
  const existing = db.prepare(
    "SELECT id, index_text FROM vector_index_items WHERE target_type = ? AND target_id = ?"
  ).get(targetType, targetId) as { id: number; index_text: string } | undefined;
  if (existing) {
    if (existing.index_text !== indexText) {
      db.prepare(
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
      db.prepare("DELETE FROM memory_vectors WHERE rowid = ?").run(existing.id);
    }
    return existing.id;
  }
  const result = db.prepare(
    `INSERT INTO vector_index_items
     (target_type, target_id, plant_id, index_text, embedding_provider,
      embedding_model, embedding_dim, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
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

const insertVector = (rowId: number, embedding: number[]): void => {
  const safeRowId = Math.trunc(rowId);
  const vectorJson = JSON.stringify(embedding);
  getDb().prepare(`INSERT OR REPLACE INTO memory_vectors(rowid, embedding) VALUES (${safeRowId}, ?)`)
    .run(vectorJson);
};

const missingVectorTargets = (plantId: string): Array<{
  targetType: TargetType;
  targetId: string;
  indexText: string;
}> => {
  const episodes = listEpisodeMemories(plantId, 500).map((memory) => ({
    targetType: "episode" as const,
    targetId: memory.id,
    indexText: indexTextForEpisode(memory)
  }));
  const understandings = listUnderstandings(plantId).map((understanding) => ({
    targetType: "understanding" as const,
    targetId: understanding.id,
    indexText: indexTextForUnderstanding(understanding)
  }));
  const rows = getDb().prepare(
    "SELECT target_type, target_id, index_text FROM vector_index_items WHERE plant_id = ?"
  ).all(plantId) as Array<{ target_type: TargetType; target_id: string; index_text: string }>;
  const existing = new Map(rows.map((row) => [`${row.target_type}:${row.target_id}`, row.index_text]));
  return [...episodes, ...understandings].filter((item) => {
    return existing.get(`${item.targetType}:${item.targetId}`) !== item.indexText;
  });
};

export const ensureVectorIndexForPlant = async (plantId: string): Promise<boolean> => {
  const targets = missingVectorTargets(plantId);
  if (!targets.length) return vecTableExists();
  const embeddings = await embedTexts(targets.map((item) => item.indexText));
  if (!embeddings?.length) return false;
  resetVectorIndexIfConfigChanged(embeddings[0]!.length);
  createVecTable(embeddings[0]!.length);
  targets.forEach((target, index) => {
    const embedding = embeddings[index];
    if (!embedding?.length) return;
    const rowId = getVectorItemId(
      target.targetType,
      target.targetId,
      plantId,
      target.indexText,
      embedding.length
    );
    insertVector(rowId, embedding);
  });
  return true;
};

export const getVectorCandidates = async (
  plantId: string,
  targetType: TargetType,
  query: string,
  limit: number
): Promise<VectorCandidate[]> => {
  if (!vecTableExists()) return [];
  const embedding = (await embedTexts([query]))?.[0];
  if (!embedding?.length) return [];
  const candidateLimit = Math.max(limit * 10, 50);
  const rows = getDb().prepare(
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
  ).all(JSON.stringify(embedding), candidateLimit, plantId, targetType, limit) as Array<{
    target_type: TargetType;
    target_id: string;
    index_text: string;
    distance: number;
  }>;
  return rows.map((row) => ({
    targetType: row.target_type,
    targetId: row.target_id,
    indexText: row.index_text,
    distance: row.distance
  }));
};
