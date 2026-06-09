import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("recentVisibleMessages hides memory-only compat turns", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/message-visibility-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb, getDb } = await import("../../db/connection.js");
  const { createPlant } = await import("../plants/plantRepository.js");
  const {
    addMessage,
    nextTurn,
    recentMessages,
    recentVisibleMessages
  } = await import("./messageRepository.js");

  try {
    migrate();
    const plant = createPlant({ name: "可见性测试", species: "绿萝" });
    const visibleTurn = nextTurn(plant.id);
    addMessage(plant.id, visibleTurn, "user", "App 里看得到");
    const hiddenTurn = nextTurn(plant.id);
    addMessage(plant.id, hiddenTurn, "user", "只进植物意识", []);

    assert.equal(recentMessages(plant.id, 10).length, 2);
    assert.deepEqual(
      recentVisibleMessages(plant.id, 10).map((message) => message.content),
      ["App 里看得到"]
    );
    getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  } finally {
    closeDb();
  }
});
