import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type ObservationRow = {
  event_key: string;
  observations: number;
  considered_at: string | null;
};

export const observeProactiveCandidate = (
  plantId: string,
  eventKey: string | null,
  minimumObservations: number
): boolean => {
  const db = getDb();
  if (!eventKey) {
    db.prepare("DELETE FROM proactive_observation_state WHERE plant_id = ?").run(plantId);
    return false;
  }

  const row = db
    .prepare("SELECT event_key, observations, considered_at FROM proactive_observation_state WHERE plant_id = ?")
    .get(plantId) as ObservationRow | undefined;
  const now = nowIso();
  if (!row || row.event_key !== eventKey) {
    const consideredAt = minimumObservations <= 1 ? now : null;
    db.prepare(
      `INSERT INTO proactive_observation_state
       (plant_id, event_key, observations, first_observed_at, last_observed_at, considered_at)
       VALUES (?, ?, 1, ?, ?, ?)
       ON CONFLICT(plant_id) DO UPDATE SET
         event_key = excluded.event_key,
         observations = 1,
         first_observed_at = excluded.first_observed_at,
         last_observed_at = excluded.last_observed_at,
         considered_at = excluded.considered_at`
    ).run(plantId, eventKey, now, now, consideredAt);
    return minimumObservations <= 1;
  }

  const observations = row.observations + 1;
  const shouldConsider = !row.considered_at && observations >= minimumObservations;
  db.prepare(
    `UPDATE proactive_observation_state
     SET observations = ?, last_observed_at = ?, considered_at = ?
     WHERE plant_id = ?`
  ).run(observations, now, shouldConsider ? now : row.considered_at, plantId);
  return shouldConsider;
};
