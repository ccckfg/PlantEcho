import assert from "node:assert/strict";
import test from "node:test";
import { closeDb, getDb } from "../../db/connection.js";
import { migrate } from "../../db/migrate.js";
import { createPlant } from "../plants/plantRepository.js";
import { createReminder, getReminder } from "../proactive/reminderRepository.js";
import { applyCommitmentPatch } from "./commitmentService.js";

test("commitment patch creates an intention and cancellation cascades to reminders", async () => {
  await migrate();
  const plant = await createPlant({ name: "约定测试", species: "绿萝" });
  const reminder = await createReminder(
    plant.id,
    "参加面试",
    new Date("2026-08-20T01:00:00.000Z")
  );
  try {
    const created = await applyCommitmentPatch(plant.id, 3, {
      operations: [{
        action: "upsert",
        topic: "下周参加面试",
        followUpAt: "2026-08-19T01:00:00.000Z"
      }]
    }, new Date("2026-08-12T00:00:00.000Z"));
    assert.equal(created.created, 1);
    const pending = await getDb().prepare(
      "SELECT content FROM plant_intentions WHERE plant_id = ? AND status = 'pending'"
    ).get<{ content: string }>(plant.id);
    assert.match(pending?.content ?? "", /参加面试/);

    const cancelled = await applyCommitmentPatch(plant.id, 4, {
      operations: [{ action: "cancel", topic: "参加面试" }]
    });
    assert.equal(cancelled.cancelledIntentions, 1);
    assert.equal(cancelled.cancelledReminders, 1);
    assert.equal((await getReminder(reminder.id))?.status, "cancelled");
  } finally {
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
    await closeDb();
  }
});
