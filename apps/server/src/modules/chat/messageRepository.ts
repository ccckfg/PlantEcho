import { getDb } from "../../db/connection.js";
import type { DatabaseClient } from "../../db/types.js";
import { nowIso } from "../../shared/time.js";

export interface ChatMessage {
  id: number;
  plantId: string;
  turn: number;
  role: "user" | "assistant" | "system";
  content: string;
  visibleTo: string[];
  createdAt: string;
}

type MessageRow = {
  id: number;
  plant_id: string;
  turn: number;
  role: ChatMessage["role"];
  content: string;
  visible_to_json: string;
  created_at: string;
};

type TurnCounterRow = {
  next_turn: number;
};

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  plantId: row.plant_id,
  turn: row.turn,
  role: row.role,
  content: row.content,
  visibleTo: JSON.parse(row.visible_to_json) as string[],
  createdAt: row.created_at
});

export const nextTurn = async (plantId: string): Promise<number> => {
  return getDb().transaction((db) => nextTurnWithDb(db, plantId));
};

export const nextTurnWithDb = async (
  db: DatabaseClient,
  plantId: string
): Promise<number> => {
  const now = nowIso();
  const maxRow = await db
    .prepare("SELECT MAX(turn) AS max_turn FROM messages WHERE plant_id = ?")
    .get<{ max_turn: number | null }>(plantId);
  const nextFromMessages = (maxRow?.max_turn ?? 0) + 1;
  await db
    .prepare(
      `INSERT INTO plant_turn_counters (plant_id, next_turn, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (plant_id) DO NOTHING`
    )
    .run(plantId, nextFromMessages, now);
  const lockClause = db.provider === "postgres" ? " FOR UPDATE" : "";
  const row = await db
    .prepare(`SELECT next_turn FROM plant_turn_counters WHERE plant_id = ?${lockClause}`)
    .get<TurnCounterRow>(plantId);
  const turn = Math.max(row?.next_turn ?? nextFromMessages, nextFromMessages);
  await db
    .prepare("UPDATE plant_turn_counters SET next_turn = ?, updated_at = ? WHERE plant_id = ?")
    .run(turn + 1, now, plantId);
  return turn;
};

export const addMessage = (
  plantId: string,
  turn: number,
  role: ChatMessage["role"],
  content: string,
  visibleTo = [plantId]
): Promise<ChatMessage> => {
  return addMessageWithDb(getDb(), plantId, turn, role, content, visibleTo);
};

export const addMessageWithDb = async (
  db: DatabaseClient,
  plantId: string,
  turn: number,
  role: ChatMessage["role"],
  content: string,
  visibleTo = [plantId]
): Promise<ChatMessage> => {
  const result = await db
    .prepare(
      `INSERT INTO messages
       (plant_id, turn, role, content, visible_to_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
    .run(plantId, turn, role, content, JSON.stringify(visibleTo), nowIso());
  return (await getMessageWithDb(db, Number(result.lastInsertRowid)))!;
};

export const getMessage = async (id: number): Promise<ChatMessage | null> => {
  return getMessageWithDb(getDb(), id);
};

export const getMessageWithDb = async (
  db: DatabaseClient,
  id: number
): Promise<ChatMessage | null> => {
  const row = await db.prepare("SELECT * FROM messages WHERE id = ?").get<MessageRow>(id);
  return row ? toMessage(row) : null;
};

export const recentMessages = async (plantId: string, limit = 16): Promise<ChatMessage[]> => {
  const rows = await getDb()
    .prepare("SELECT * FROM messages WHERE plant_id = ? ORDER BY turn DESC, id DESC LIMIT ?")
    .all<MessageRow>(plantId, limit);
  return rows.map(toMessage).reverse();
};

export const recentVisibleMessages = async (plantId: string, limit = 16): Promise<ChatMessage[]> => {
  const rows = await getDb()
    .prepare("SELECT * FROM messages WHERE plant_id = ? AND visible_to_json <> '[]' ORDER BY turn DESC, id DESC LIMIT ?")
    .all<MessageRow>(plantId, limit);
  return rows.map(toMessage).reverse();
};

export const latestMessageByRole = (
  plantId: string,
  role: ChatMessage["role"]
): Promise<ChatMessage | null> => {
  return latestMessageByRoleWithDb(getDb(), plantId, role);
};

export const latestMessageByRoleWithDb = async (
  db: DatabaseClient,
  plantId: string,
  role: ChatMessage["role"]
): Promise<ChatMessage | null> => {
  const row = await db
    .prepare("SELECT * FROM messages WHERE plant_id = ? AND role = ? ORDER BY id DESC LIMIT 1")
    .get<MessageRow>(plantId, role);
  return row ? toMessage(row) : null;
};

export const messagesInTurnRange = (
  plantId: string,
  turnGe: number,
  turnLe?: number
): Promise<ChatMessage[]> => {
  return messagesInTurnRangeWithDb(getDb(), plantId, turnGe, turnLe);
};

export const messagesInTurnRangeWithDb = async (
  db: DatabaseClient,
  plantId: string,
  turnGe: number,
  turnLe?: number
): Promise<ChatMessage[]> => {
  const sql = turnLe === undefined
    ? "SELECT * FROM messages WHERE plant_id = ? AND turn >= ? ORDER BY turn ASC, id ASC"
    : "SELECT * FROM messages WHERE plant_id = ? AND turn >= ? AND turn <= ? ORDER BY turn ASC, id ASC";
  const params = turnLe === undefined ? [plantId, turnGe] : [plantId, turnGe, turnLe];
  const rows = await db.prepare(sql).all<MessageRow>(...params);
  return rows.map(toMessage);
};

export const latestUserMessageBeforeTurn = (
  plantId: string,
  currentTurn: number
): Promise<ChatMessage | null> => {
  return latestUserMessageBeforeTurnWithDb(getDb(), plantId, currentTurn);
};

export const latestUserMessageBeforeTurnWithDb = async (
  db: DatabaseClient,
  plantId: string,
  currentTurn: number
): Promise<ChatMessage | null> => {
  const row = await db
    .prepare("SELECT * FROM messages WHERE plant_id = ? AND role = 'user' AND turn < ? ORDER BY id DESC LIMIT 1")
    .get<MessageRow>(plantId, currentTurn);
  return row ? toMessage(row) : null;
};
