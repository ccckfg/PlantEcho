import { getDb } from "../../db/connection.js";
import { normalizeIanaTimezone } from "../../shared/timezone.js";

export const persistPlantOwnerTimezone = async (
  plantId: string,
  timezone: string | undefined
): Promise<string | null> => {
  const valid = normalizeIanaTimezone(timezone);
  if (!valid) return null;
  await getDb().prepare(
    `UPDATE users SET timezone = ?
     WHERE id = (SELECT user_id FROM plants WHERE id = ?)`
  ).run(valid, plantId);
  return valid;
};

export const getPlantOwnerTimezone = async (plantId: string): Promise<string | null> => {
  const row = await getDb().prepare(
    `SELECT users.timezone
     FROM users INNER JOIN plants ON plants.user_id = users.id
     WHERE plants.id = ?`
  ).get<{ timezone: string | null }>(plantId);
  return normalizeIanaTimezone(row?.timezone ?? undefined);
};
