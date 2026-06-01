import { getDb } from "../../db/connection.js";
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

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  plantId: row.plant_id,
  turn: row.turn,
  role: row.role,
  content: row.content,
  visibleTo: JSON.parse(row.visible_to_json) as string[],
  createdAt: row.created_at
});

export const nextTurn = (plantId: string): number => {
  const row = getDb().prepare("SELECT MAX(turn) AS max_turn FROM messages WHERE plant_id = ?").get(plantId) as
    | { max_turn: number | null }
    | undefined;
  return (row?.max_turn ?? 0) + 1;
};

export const addMessage = (
  plantId: string,
  turn: number,
  role: ChatMessage["role"],
  content: string,
  visibleTo = [plantId]
): ChatMessage => {
  const result = getDb()
    .prepare("INSERT INTO messages (plant_id, turn, role, content, visible_to_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(plantId, turn, role, content, JSON.stringify(visibleTo), nowIso());
  return getMessage(Number(result.lastInsertRowid))!;
};

export const getMessage = (id: number): ChatMessage | null => {
  const row = getDb().prepare("SELECT * FROM messages WHERE id = ?").get(id) as MessageRow | undefined;
  return row ? toMessage(row) : null;
};

export const recentMessages = (plantId: string, limit = 16): ChatMessage[] => {
  const rows = getDb()
    .prepare("SELECT * FROM messages WHERE plant_id = ? ORDER BY turn DESC, id DESC LIMIT ?")
    .all(plantId, limit) as MessageRow[];
  return rows.map(toMessage).reverse();
};

export const messagesInTurnRange = (
  plantId: string,
  turnGe: number,
  turnLe?: number
): ChatMessage[] => {
  const sql = turnLe === undefined
    ? "SELECT * FROM messages WHERE plant_id = ? AND turn >= ? ORDER BY turn ASC, id ASC"
    : "SELECT * FROM messages WHERE plant_id = ? AND turn >= ? AND turn <= ? ORDER BY turn ASC, id ASC";
  const params = turnLe === undefined ? [plantId, turnGe] : [plantId, turnGe, turnLe];
  const rows = getDb().prepare(sql).all(...params) as MessageRow[];
  return rows.map(toMessage);
};
