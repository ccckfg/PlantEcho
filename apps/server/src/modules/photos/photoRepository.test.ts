import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import test from "node:test";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

test("deletePlantPhoto removes database row, local file and avatar reference", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/photo-delete-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { getDb, closeDb } = await import("../../db/connection.js");
  const { createPlant, getPlant, updatePlant } = await import("../plants/plantRepository.js");
  const { createPlantPhoto, deletePlantPhoto } = await import("./photoRepository.js");

  migrate();
  const plant = createPlant({ name: "相册删除测试", species: "绿萝" });
  try {
    const photo = await createPlantPhoto(plant.id, {
      fileName: "leaf.png",
      dataUrl: tinyPng,
      caption: "要删除的照片"
    });
    const row = getDb()
      .prepare("SELECT content_path FROM plant_photos WHERE id = ?")
      .get(photo.id) as { content_path: string };
    updatePlant(plant.id, { avatarUrl: photo.contentUrl });

    const deleted = await deletePlantPhoto(plant.id, photo.id);

    assert.equal(deleted?.photo.id, photo.id);
    assert.equal(deleted?.avatarCleared, true);
    assert.equal(getPlant(plant.id)?.avatarUrl, null);
    const count = getDb()
      .prepare("SELECT COUNT(*) AS count FROM plant_photos WHERE id = ?")
      .get(photo.id) as { count: number };
    assert.equal(count.count, 0);
    assert.equal(await fileExists(row.content_path), false);
  } finally {
    getDb().prepare("DELETE FROM plants WHERE id = ?").run(plant.id);
    closeDb();
  }
});
