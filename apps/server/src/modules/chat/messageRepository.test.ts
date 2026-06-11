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
    await migrate();
    const plant = await createPlant({ name: "可见性测试", species: "绿萝" });
    const visibleTurn = await nextTurn(plant.id);
    await addMessage(plant.id, visibleTurn, "user", "App 里看得到");
    const hiddenTurn = await nextTurn(plant.id);
    await addMessage(plant.id, hiddenTurn, "user", "只进植物意识", []);

    assert.equal((await recentMessages(plant.id, 10)).length, 2);
    assert.deepEqual(
      (await recentVisibleMessages(plant.id, 10)).map((message) => message.content),
      ["App 里看得到"]
    );
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  } finally {
    await closeDb();
  }
});

test("nextTurn allocates unique turns before messages are inserted", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/message-turns-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb, getDb } = await import("../../db/connection.js");
  const { createPlant } = await import("../plants/plantRepository.js");
  const { nextTurn } = await import("./messageRepository.js");

  try {
    await migrate();
    const plant = await createPlant({ name: "并发测试", species: "绿萝" });
    const turns = await Promise.all(Array.from({ length: 8 }, () => nextTurn(plant.id)));

    assert.deepEqual([...turns].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
  } finally {
    await closeDb();
  }
});
