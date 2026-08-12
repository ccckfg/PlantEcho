import assert from "node:assert/strict";
import test from "node:test";
import { getDb } from "../../db/connection.js";
import { migrate } from "../../db/migrate.js";
import { addMessage, nextTurn } from "../chat/messageRepository.js";
import { createPlant } from "../plants/plantRepository.js";
import { generateTemporalIntentions } from "./temporalTriggers.js";

type IntentionRow = { kind: string; source_id: string; status: string };

const temporalIntentions = (plantId: string): Promise<IntentionRow[]> =>
  getDb().prepare(
    "SELECT kind, source_id, status FROM plant_intentions WHERE plant_id = ? AND source_type = 'temporal' ORDER BY kind"
  ).all<IntentionRow>(plantId);

const addUserMessageAt = async (plantId: string, text: string, at: Date): Promise<void> => {
  const message = await addMessage(plantId, await nextTurn(plantId), "user", text);
  await getDb().prepare("UPDATE messages SET created_at = ? WHERE id = ?")
    .run(at.toISOString(), message.id);
};

test("warm relationships reconnect after three days and anniversary sources are idempotent", async () => {
  await migrate();
  const plant = await createPlant({ name: "周年小绿", species: "绿萝" });
  const now = new Date("2026-08-12T00:30:00.000Z");
  try {
    await getDb().prepare("UPDATE plants SET created_at = ? WHERE id = ?")
      .run("2025-08-12T00:30:00.000Z", plant.id);
    await getDb().prepare("UPDATE plant_relationship_state SET stage = '信任' WHERE plant_id = ?")
      .run(plant.id);
    await addUserMessageAt(plant.id, "四天前聊过", new Date(now.getTime() - 4 * 86_400_000));

    await generateTemporalIntentions(plant.id, now);
    await generateTemporalIntentions(plant.id, now);
    const rows = await temporalIntentions(plant.id);

    assert.deepEqual(rows.map((row) => row.kind), ["adoption_anniversary", "reconnect"]);
    assert.equal(new Set(rows.map((row) => row.source_id)).size, 2);
    assert.equal(rows.some((row) => row.kind === "morning_greeting"), false);
  } finally {
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  }
});

test("cool relationships wait seven days and a new user message closes the stale candidate", async () => {
  await migrate();
  const plant = await createPlant({ name: "节律小绿", species: "绿萝" });
  const now = new Date("2026-08-12T12:00:00.000Z");
  try {
    await addUserMessageAt(plant.id, "四天前聊过", new Date(now.getTime() - 4 * 86_400_000));
    await generateTemporalIntentions(plant.id, now);
    assert.equal((await temporalIntentions(plant.id)).some((row) => row.kind === "reconnect"), false);

    await getDb().prepare(
      "UPDATE messages SET created_at = ? WHERE plant_id = ? AND role = 'user'"
    ).run(new Date(now.getTime() - 8 * 86_400_000).toISOString(), plant.id);
    await generateTemporalIntentions(plant.id, now);
    assert.equal((await temporalIntentions(plant.id)).find((row) => row.kind === "reconnect")?.status, "pending");

    await addUserMessageAt(plant.id, "我回来了", now);
    await generateTemporalIntentions(plant.id, new Date(now.getTime() + 60_000));
    assert.equal((await temporalIntentions(plant.id)).find((row) => row.kind === "reconnect")?.status, "dismissed");
  } finally {
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  }
});
