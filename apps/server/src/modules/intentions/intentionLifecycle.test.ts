import assert from "node:assert/strict";
import test from "node:test";
import { closeDb, getDb } from "../../db/connection.js";
import { migrate } from "../../db/migrate.js";
import { createPlant } from "../plants/plantRepository.js";
import { createIntention, noteIntentionKept } from "./intentionRepository.js";

test("keep extends cooldown without spending a consideration life", async () => {
  await migrate();
  const plant = await createPlant({ name: "念头测试", species: "绿萝" });
  try {
    const intention = await createIntention({
      plantId: plant.id,
      kind: "follow_up",
      content: "问问面试怎么样了",
      sourceType: "user",
      sourceId: "1",
      priority: 2,
      notBefore: new Date(Date.now() - 1_000).toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString()
    });
    const first = await noteIntentionKept(intention.id, 1_000, 4_000);
    const second = await noteIntentionKept(intention.id, 1_000, 4_000);
    assert.equal(first?.consideredCount, 0);
    assert.equal(first?.keepCount, 1);
    assert.equal(second?.consideredCount, 0);
    assert.equal(second?.keepCount, 2);
    assert.ok(Date.parse(second?.notBefore ?? "") > Date.now());
    assert.equal(second?.status, "pending");
  } finally {
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
    await closeDb();
  }
});
