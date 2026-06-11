import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("status tags use online/offline primary and no rule fallback on LLM failure", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/status-tags-${randomUUID()}`;
  process.env.LLM_API_URL = "http://llm.test";
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_MODEL_ID = "test-model";
  const originalFetch = globalThis.fetch;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb, getDb } = await import("../../db/connection.js");
  const { createPlant } = await import("./plantRepository.js");
  const { getPlantStatusTags } = await import("./plantStatusTagService.js");

  await migrate();
  const plant = await createPlant({ name: "标签测试", species: "茉莉" });
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: '{"tags":["慢生长","适应中","过长标签会过滤"]}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      }), { status: 200 })) as typeof fetch;

    const generated = await getPlantStatusTags(plant.id);
    assert.equal(generated.primary.label, "离线");
    assert.deepEqual(generated.secondary.tags, ["慢生长", "适应中"]);
    assert.equal(generated.secondary.source, "llm");

    const oldUpdatedAt = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
    await getDb()
      .prepare("UPDATE plant_status_tags SET updated_at = ? WHERE plant_id = ?")
      .run(oldUpdatedAt, plant.id);
    globalThis.fetch = (async () =>
      new Response("failed", { status: 500 })) as typeof fetch;

    const failedRefresh = await getPlantStatusTags(plant.id);
    assert.equal(failedRefresh.primary.label, "离线");
    assert.deepEqual(failedRefresh.secondary.tags, []);
    assert.equal(failedRefresh.secondary.source, "none");
  } finally {
    globalThis.fetch = originalFetch;
    await getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
    await closeDb();
  }
});
