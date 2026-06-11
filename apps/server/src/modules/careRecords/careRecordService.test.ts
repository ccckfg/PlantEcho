import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("care records: create persists and lists newest-first with sync event", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/care-records-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const { createPlant } = await import("../plants/plantRepository.js");
  const { createCareRecord, getPlantCareRecords } = await import("./careRecordService.js");
  const { onSyncEvent } = await import("../sync/syncBus.js");

  try {
    await migrate();
    const plant = await createPlant({ name: "养护记录测试", species: "绿萝" });

    const events: string[] = [];
    const off = onSyncEvent((event) => {
      if (event.resource === "care_records") events.push(event.type);
    });

    const first = await createCareRecord(plant.id, {
      type: "water",
      note: "浇了约200ml",
      source: "panel",
      performedAt: "2026-06-10T08:00:00.000Z"
    });
    const second = await createCareRecord(plant.id, {
      type: "fertilize",
      source: "chat",
      performedAt: "2026-06-11T08:00:00.000Z"
    });

    assert.equal(first.type, "water");
    assert.equal(first.note, "浇了约200ml");
    assert.equal(first.source, "panel");
    assert.equal(second.source, "chat");
    assert.equal(second.note, "");

    const records = await getPlantCareRecords(plant.id);
    assert.equal(records.length, 2);
    // 最新的（performed_at 更晚）排在最前
    assert.equal(records[0].id, second.id);
    assert.equal(records[1].id, first.id);

    assert.deepEqual(events, ["care_records.changed", "care_records.changed"]);
    off();
  } finally {
    await closeDb();
  }
});

test("care records: unknown plant is a 404 ServiceError", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/care-records-404-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const { createCareRecord } = await import("./careRecordService.js");
  const { ServiceError } = await import("../../shared/serviceError.js");

  try {
    await migrate();
    await assert.rejects(
      () => createCareRecord("does-not-exist", { type: "water" }),
      (error: unknown) => error instanceof ServiceError && error.statusCode === 404
    );
  } finally {
    await closeDb();
  }
});
