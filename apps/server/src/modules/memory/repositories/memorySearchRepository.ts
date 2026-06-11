import { getDb } from "../../../db/connection.js";
import { ftsDocument, ftsMatchQuery } from "../../../shared/text.js";
import { nowIso } from "../../../shared/time.js";

export interface RawEpisodeCandidate {
  id: string;
  content: string;
  score: number;
  date: string;
  time: string;
  title: string;
  keywords: string[];
  importance: number;
  lastRecalledAt: string;
  createdAt: string;
}

export interface RawUnderstandingCandidate {
  id: string;
  subject: string;
  content: string;
  keywords: string[];
  score: number;
}

type EpisodeCandidateRow = {
  id: string;
  content: string;
  score: number;
  date: string;
  time: string;
  title: string;
  keywords_json: string;
  importance: number;
  last_recalled_at: string;
  created_at: string;
};

type UnderstandingCandidateRow = {
  id: string;
  subject: string;
  content: string;
  keywords_json: string;
  score: number;
};

const parseKeywords = (text: string): string[] => {
  try {
    return JSON.parse(text) as string[];
  } catch {
    return [];
  }
};

const toEpisodeCandidate = (row: EpisodeCandidateRow): RawEpisodeCandidate => ({
  id: row.id,
  content: row.content,
  score: row.score,
  date: row.date,
  time: row.time,
  title: row.title,
  keywords: parseKeywords(row.keywords_json),
  importance: row.importance,
  lastRecalledAt: row.last_recalled_at,
  createdAt: row.created_at
});

const toUnderstandingCandidate = (row: UnderstandingCandidateRow): RawUnderstandingCandidate => ({
  id: row.id,
  subject: row.subject,
  content: row.content,
  keywords: parseKeywords(row.keywords_json),
  score: row.score
});

export const syncEpisodeFts = async (
  memoryId: string,
  plantId: string,
  title: string,
  content: string,
  keywords: string[]
): Promise<void> => {
  const db = getDb();
  if (db.provider === "postgres") return Promise.resolve();
  await db.prepare("DELETE FROM plant_memories_fts WHERE target_id = ?").run(memoryId);
  await db.prepare(
    "INSERT INTO plant_memories_fts (target_id, plant_id, title, content, keywords) VALUES (?, ?, ?, ?, ?)"
  ).run(memoryId, plantId, ftsDocument(title), ftsDocument(content), ftsDocument(keywords.join(" ")));
};

export const syncUnderstandingFts = async (
  understandingId: string,
  plantId: string,
  subject: string,
  content: string,
  keywords: string[]
): Promise<void> => {
  const db = getDb();
  if (db.provider === "postgres") return Promise.resolve();
  await db.prepare("DELETE FROM plant_understandings_fts WHERE target_id = ?").run(understandingId);
  await db.prepare(
    "INSERT INTO plant_understandings_fts (target_id, plant_id, subject, content, keywords) VALUES (?, ?, ?, ?, ?)"
  ).run(understandingId, plantId, ftsDocument(subject), ftsDocument(content), ftsDocument(keywords.join(" ")));
};

export const rebuildFtsIndexes = async (): Promise<void> => {
  const db = getDb();
  if (db.provider === "postgres") return;
  await db.exec("DELETE FROM plant_memories_fts");
  await db.exec("DELETE FROM plant_understandings_fts");
  const memories = await db.prepare(
    "SELECT id, plant_id, title, content, keywords_json FROM plant_memories"
  ).all<{ id: string; plant_id: string; title: string; content: string; keywords_json: string }>();
  for (const memory of memories) {
    await syncEpisodeFts(memory.id, memory.plant_id, memory.title, memory.content, parseKeywords(memory.keywords_json));
  }
  const understandings = await db.prepare(
    "SELECT id, plant_id, subject, content, keywords_json FROM plant_understandings"
  ).all<{ id: string; plant_id: string; subject: string; content: string; keywords_json: string }>();
  for (const item of understandings) {
    await syncUnderstandingFts(item.id, item.plant_id, item.subject, item.content, parseKeywords(item.keywords_json));
  }
};

export const getEpisodeBm25Candidates = async (
  plantId: string,
  query: string,
  limit: number
): Promise<RawEpisodeCandidate[]> => {
  const match = ftsMatchQuery(query);
  if (!match) return [];
  const db = getDb();
  if (db.provider === "postgres") {
    const rows = await db.prepare(
      `SELECT id, content,
              ts_rank_cd(search_vector, plainto_tsquery('simple', ?)) AS score,
              date, time, title, keywords_json, importance, last_recalled_at, created_at
       FROM plant_memories
       WHERE plant_id = ? AND search_vector @@ plainto_tsquery('simple', ?)
       ORDER BY score DESC
       LIMIT ?`
    ).all<EpisodeCandidateRow>(match, plantId, match, limit);
    return rows.map(toEpisodeCandidate);
  }
  const rows = await db.prepare(
    `SELECT m.id, m.content, ABS(bm25(plant_memories_fts, 1.5, 3.0, 1.0)) AS score,
            m.date, m.time, m.title, m.keywords_json, m.importance,
            m.last_recalled_at, m.created_at
     FROM plant_memories_fts
     JOIN plant_memories m ON m.id = plant_memories_fts.target_id
     WHERE plant_memories_fts MATCH ? AND plant_memories_fts.plant_id = ?
     ORDER BY score DESC
     LIMIT ?`
  ).all<EpisodeCandidateRow>(match, plantId, limit);
  return rows.map(toEpisodeCandidate);
};

export const getUnderstandingBm25Candidates = async (
  plantId: string,
  query: string,
  limit: number
): Promise<RawUnderstandingCandidate[]> => {
  const match = ftsMatchQuery(query);
  if (!match) return [];
  const db = getDb();
  if (db.provider === "postgres") {
    const rows = await db.prepare(
      `SELECT id, subject, content, keywords_json,
              ts_rank_cd(search_vector, plainto_tsquery('simple', ?)) AS score
       FROM plant_understandings
       WHERE plant_id = ? AND search_vector @@ plainto_tsquery('simple', ?)
       ORDER BY score DESC
       LIMIT ?`
    ).all<UnderstandingCandidateRow>(match, plantId, match, limit);
    return rows.map(toUnderstandingCandidate);
  }
  const rows = await db.prepare(
    `SELECT u.id, u.subject, u.content, u.keywords_json,
            ABS(bm25(plant_understandings_fts, 2.0, 1.0, 3.0)) AS score
     FROM plant_understandings_fts
     JOIN plant_understandings u ON u.id = plant_understandings_fts.target_id
     WHERE plant_understandings_fts MATCH ? AND plant_understandings_fts.plant_id = ?
     ORDER BY score DESC
     LIMIT ?`
  ).all<UnderstandingCandidateRow>(match, plantId, limit);
  return rows.map(toUnderstandingCandidate);
};

export const getHistoryWindowStart = async (plantId: string): Promise<number> => {
  const row = await getDb()
    .prepare("SELECT start_turn FROM history_window_state WHERE plant_id = ?")
    .get<{ start_turn: number }>(plantId);
  return row?.start_turn ?? 0;
};

export const setHistoryWindowStart = async (plantId: string, startTurn: number): Promise<void> => {
  await getDb().prepare(
    `INSERT INTO history_window_state (plant_id, start_turn, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(plant_id) DO UPDATE SET
       start_turn = excluded.start_turn,
       updated_at = excluded.updated_at`
  ).run(plantId, startTurn, nowIso());
};
