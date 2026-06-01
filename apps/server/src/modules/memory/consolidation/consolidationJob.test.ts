import assert from "node:assert/strict";
import test from "node:test";
import { mergeConsolidationPayload } from "./consolidationJob.js";

test("mergeConsolidationPayload keeps the newest turn", () => {
  const merged = mergeConsolidationPayload(
    { plantId: "plant-a", plantName: "old", currentTurn: 3 },
    { plantId: "plant-a", plantName: "小绿", currentTurn: 8 }
  );

  assert.deepEqual(merged, {
    plantId: "plant-a",
    plantName: "小绿",
    currentTurn: 8
  });
});

test("mergeConsolidationPayload does not move currentTurn backwards", () => {
  const merged = mergeConsolidationPayload(
    { plantId: "plant-a", plantName: "小绿", currentTurn: 12 },
    { plantId: "plant-a", plantName: "小绿", currentTurn: 4 }
  );

  assert.equal(merged.currentTurn, 12);
});
