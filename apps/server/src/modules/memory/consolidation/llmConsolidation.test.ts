import assert from "node:assert/strict";
import test from "node:test";
import { closedTurnsFromLlm } from "./llmConsolidation.js";

test("closedTurnsFromLlm preserves multiple boundaries in order", () => {
  const turns = closedTurnsFromLlm({
    小绿: [
      { end_turn: 6, old_theme: "二", new_theme: "三", reason: "切换" },
      { end_turn: 3, old_theme: "一", new_theme: "二", reason: "切换" },
      { end_turn: 6, old_theme: "重复", new_theme: "三", reason: "重复" }
    ]
  }, "小绿", 8);

  assert.deepEqual(turns, [3, 6]);
});
