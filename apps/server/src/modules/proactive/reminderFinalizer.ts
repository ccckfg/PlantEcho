import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";
import { addMessageWithDb, nextTurnWithDb } from "../chat/messageRepository.js";
import { logProactiveEventWithDb } from "./eventLogRepository.js";
import type { ProactiveEventInput } from "./types.js";

export interface FinalizedReminderDelivery {
  messageId: number;
  turn: number;
}

export const finalizeReminderDelivery = async (input: {
  reminderId: string;
  claimToken: string;
  event: ProactiveEventInput;
  content: string;
}): Promise<FinalizedReminderDelivery | null> => {
  return getDb().transaction(async (db) => {
    const lockClause = db.provider === "postgres" ? " FOR UPDATE" : "";
    const claim = await db.prepare(
      `SELECT id FROM proactive_reminders
       WHERE id = ? AND plant_id = ? AND status = 'processing' AND claim_token = ?${lockClause}`
    ).get<{ id: string }>(input.reminderId, input.event.plantId, input.claimToken);
    if (!claim) return null;

    const turn = await nextTurnWithDb(db, input.event.plantId);
    const message = await addMessageWithDb(
      db,
      input.event.plantId,
      turn,
      "assistant",
      input.content
    );
    await logProactiveEventWithDb(db, input.event, message.id);
    const completed = await db.prepare(
      `UPDATE proactive_reminders
       SET status = 'sent', claim_token = NULL, claim_expires_at = NULL,
           message_id = ?, updated_at = ?
       WHERE id = ? AND status = 'processing' AND claim_token = ?`
    ).run(message.id, nowIso(), input.reminderId, input.claimToken);
    if (completed.changes !== 1) {
      throw new Error("Reminder claim changed during atomic finalization");
    }
    return { messageId: message.id, turn };
  });
};
