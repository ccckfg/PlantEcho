import { randomUUID } from "node:crypto";
import { getDb } from "../../../db/connection.js";
import { nowIso } from "../../../shared/time.js";
import type { EpisodeMemory, MemoryDraft, Understanding } from "../domain/types.js";
import { syncEpisodeFts, syncUnderstandingFts } from "./memorySearchRepository.js";

type DraftRow = {
  id: number;
  plant_id: string;
  turn: number;
  text: string;
  metadata_json: string;
  consumed_at: string | null;
  created_at: string;
};

type MemoryRow = {
  id: string;
  plant_id: string;
  date: string;
  time: string;
  location: string;
  participants: string;
  title: string;
  content: string;
  keywords_json: string;
  importance: number;
  source_type: string;
  raw_dialogue: string;
  raw_payload_json: string;
  last_recalled_at: string;
  created_at: string;
};

type UnderstandingRow = {
  id: string;
  plant_id: string;
  subject: string;
  content: string;
  keywords_json: string;
  linked_memories_json: string;
  history_json: string;
  updated_at: string;
};


const parseJson = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

const toDraft = (row: DraftRow): MemoryDraft => ({
  id: row.id,
  plantId: row.plant_id,
  turn: row.turn,
  text: row.text,
  metadata: parseJson(row.metadata_json, {}),
  consumedAt: row.consumed_at,
  createdAt: row.created_at
});

const toMemory = (row: MemoryRow): EpisodeMemory => ({
  id: row.id,
  plantId: row.plant_id,
  date: row.date,
  time: row.time,
  location: row.location,
  participants: row.participants,
  title: row.title,
  content: row.content,
  keywords: parseJson(row.keywords_json, []),
  importance: row.importance,
  sourceType: row.source_type,
  rawDialogue: row.raw_dialogue,
  rawPayload: parseJson(row.raw_payload_json, {}),
  lastRecalledAt: row.last_recalled_at,
  createdAt: row.created_at
});

const toUnderstanding = (row: UnderstandingRow): Understanding => ({
  id: row.id,
  plantId: row.plant_id,
  subject: row.subject,
  content: row.content,
  keywords: parseJson(row.keywords_json, []),
  linkedMemories: parseJson(row.linked_memories_json, []),
  history: parseJson(row.history_json, []),
  updatedAt: row.updated_at
});

export const addMemoryDraft = (
  plantId: string,
  turn: number,
  text: string,
  metadata: Record<string, unknown>
): MemoryDraft => {
  const now = nowIso();
  const result = getDb()
    .prepare("INSERT INTO memory_drafts (plant_id, turn, text, metadata_json, consumed_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(plantId, turn, text, JSON.stringify(metadata), null, now);
  return getMemoryDraft(Number(result.lastInsertRowid))!;
};

export const getMemoryDraft = (id: number): MemoryDraft | null => {
  const row = getDb().prepare("SELECT * FROM memory_drafts WHERE id = ?").get(id) as DraftRow | undefined;
  return row ? toDraft(row) : null;
};

export const getOpenDrafts = (plantId: string, limit = 8): MemoryDraft[] => {
  const rows = getDb()
    .prepare("SELECT * FROM memory_drafts WHERE plant_id = ? AND consumed_at IS NULL ORDER BY id ASC LIMIT ?")
    .all(plantId, limit) as DraftRow[];
  return rows.map(toDraft);
};

export const getDraftsUntilTurn = (plantId: string, untilTurn: number): MemoryDraft[] => {
  const rows = getDb()
    .prepare(
      "SELECT * FROM memory_drafts WHERE plant_id = ? AND consumed_at IS NULL AND turn <= ? ORDER BY turn ASC, id ASC"
    )
    .all(plantId, untilTurn) as DraftRow[];
  return rows.map(toDraft);
};

export const markDraftsConsumed = (ids: number[]): void => {
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  getDb().prepare(`UPDATE memory_drafts SET consumed_at = ? WHERE id IN (${placeholders})`).run(nowIso(), ...ids);
};


export const addEpisodeMemory = (
  input: Omit<EpisodeMemory, "id" | "createdAt" | "lastRecalledAt">
): EpisodeMemory => {
  const id = randomUUID();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO plant_memories
       (id, plant_id, date, time, location, participants, title, content, keywords_json, importance,
        source_type, raw_dialogue, raw_payload_json, last_recalled_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.plantId,
      input.date,
      input.time,
      input.location,
      input.participants,
      input.title,
      input.content,
      JSON.stringify(input.keywords),
      input.importance,
      input.sourceType,
      input.rawDialogue,
      JSON.stringify(input.rawPayload),
      now,
      now
    );
  const memory = getEpisodeMemory(id)!;
  syncEpisodeFts(memory.id, memory.plantId, memory.title, memory.content, memory.keywords);
  return memory;
};

export const getEpisodeMemory = (id: string): EpisodeMemory | null => {
  const row = getDb().prepare("SELECT * FROM plant_memories WHERE id = ?").get(id) as MemoryRow | undefined;
  return row ? toMemory(row) : null;
};

export const listEpisodeMemories = (plantId: string, limit = 100): EpisodeMemory[] => {
  const rows = getDb()
    .prepare("SELECT * FROM plant_memories WHERE plant_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(plantId, limit) as MemoryRow[];
  return rows.map(toMemory);
};

export const hasRecentMemory = (plantId: string, sourceType: string, sinceIso: string): boolean => {
  const row = getDb()
    .prepare("SELECT id FROM plant_memories WHERE plant_id = ? AND source_type = ? AND created_at >= ? LIMIT 1")
    .get(plantId, sourceType, sinceIso);
  return Boolean(row);
};

export const updateMemoryRecall = (memoryIds: string[], recalledAt: string): void => {
  if (!memoryIds.length) return;
  const placeholders = memoryIds.map(() => "?").join(",");
  getDb().prepare(`UPDATE plant_memories SET last_recalled_at = ? WHERE id IN (${placeholders})`).run(recalledAt, ...memoryIds);
};

export const listUnderstandings = (plantId: string): Understanding[] => {
  const rows = getDb()
    .prepare("SELECT * FROM plant_understandings WHERE plant_id = ? ORDER BY updated_at DESC")
    .all(plantId) as UnderstandingRow[];
  return rows.map(toUnderstanding);
};

export const upsertUnderstanding = (
  input: Omit<Understanding, "id" | "updatedAt"> & { id?: string }
): Understanding => {
  const id = input.id ?? randomUUID();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO plant_understandings
       (id, plant_id, subject, content, keywords_json, linked_memories_json, history_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         subject = excluded.subject,
         content = excluded.content,
         keywords_json = excluded.keywords_json,
         linked_memories_json = excluded.linked_memories_json,
         history_json = excluded.history_json,
         updated_at = excluded.updated_at`
    )
    .run(
      id,
      input.plantId,
      input.subject,
      input.content,
      JSON.stringify(input.keywords),
      JSON.stringify(input.linkedMemories),
      JSON.stringify(input.history),
      now
    );
  const understanding = listUnderstandings(input.plantId).find((item) => item.id === id)!;
  syncUnderstandingFts(
    understanding.id,
    understanding.plantId,
    understanding.subject,
    understanding.content,
    understanding.keywords
  );
  return understanding;
};
