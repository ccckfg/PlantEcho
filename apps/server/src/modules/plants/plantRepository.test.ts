import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("deletePlant hides a plant and restorePlant brings the same plant back", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/plant-delete-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb, getDb } = await import("../../db/connection.js");
  const { latestSchemaVersion } = await import("../../db/migrations/index.js");
  const {
    createPlant,
    deletePlant,
    getPlant,
    listPlants,
    restorePlant,
    updatePlant
  } = await import("./plantRepository.js");

  migrate();
  const schemaVersion = getDb()
    .prepare("SELECT MAX(version) AS version FROM schema_migrations")
    .get() as { version: number };
  assert.equal(schemaVersion.version, latestSchemaVersion);

  const plant = createPlant({
    name: "删除测试小绿",
    species: "绿萝",
    location: "窗边",
    backgroundInfo: "话不多，住在窗边。"
  });
  try {
    assert.equal(plant.backgroundInfo, "话不多，住在窗边。");
    assert.equal(
      updatePlant(plant.id, { backgroundInfo: "喜欢把心事说得像风。" })?.backgroundInfo,
      "喜欢把心事说得像风。"
    );

    const deleted = deletePlant(plant.id);

    assert.equal(deleted?.id, plant.id);
    assert.equal(getPlant(plant.id), null);
    assert.equal(listPlants().some((item) => item.id === plant.id), false);

    const restored = restorePlant(plant.id);

    assert.equal(restored?.id, plant.id);
    assert.equal(restored?.name, plant.name);
    assert.equal(getPlant(plant.id)?.id, plant.id);
  } finally {
    getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
    closeDb();
  }
});
