import { getDb } from "../../db/connection.js";

export interface PlantOwnerActivity {
  userId: string | null;
  sessionLastSeenAt: string | null;
  latestUserMessageAt: string | null;
}

export const getPlantOwnerActivity = async (plantId: string): Promise<PlantOwnerActivity> => {
  const row = await getDb().prepare(
    `SELECT p.user_id,
       (SELECT MAX(s.last_seen_at) FROM auth_sessions s
        WHERE s.user_id = p.user_id AND s.revoked_at IS NULL AND s.expires_at > ?) AS session_last_seen_at,
       (SELECT MAX(m.created_at) FROM messages m
        WHERE m.plant_id = p.id AND m.role = 'user') AS latest_user_message_at
     FROM plants p WHERE p.id = ?`
  ).get<{
    user_id: string | null;
    session_last_seen_at: string | null;
    latest_user_message_at: string | null;
  }>(new Date().toISOString(), plantId);
  return {
    userId: row?.user_id ?? null,
    sessionLastSeenAt: row?.session_last_seen_at ?? null,
    latestUserMessageAt: row?.latest_user_message_at ?? null
  };
};
