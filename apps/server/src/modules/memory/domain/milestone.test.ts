import assert from "node:assert/strict";
import test from "node:test";
import type { EpisodeMemory } from "@dyn/shared";
import { deriveMilestoneMark } from "./milestone.js";

const memory = (input: Partial<EpisodeMemory>): EpisodeMemory => ({
  id: "m1",
  plantId: "p1",
  date: "2026-05-25",
  time: "19:30",
  location: "",
  participants: "主人",
  title: "普通聊天",
  content: "主人说今天不错。",
  keywords: [],
  importance: 2,
  sourceType: "llm:episode",
  rawDialogue: "",
  rawPayload: {},
  lastRecalledAt: "2026-05-25T19:30:00.000Z",
  createdAt: "2026-05-25T19:30:00.000Z",
  ...input
});

test("deriveMilestoneMark marks high importance memories", () => {
  const mark = deriveMilestoneMark(memory({ importance: 4 }));

  assert.equal(mark.isMilestone, true);
  assert.equal(mark.milestoneReason, "高重要度记忆");
});

test("deriveMilestoneMark marks sensor status transitions", () => {
  const mark = deriveMilestoneMark(memory({ sourceType: "sensor:soil_low", importance: 3 }));

  assert.equal(mark.isMilestone, true);
  assert.equal(mark.milestoneReason, "状态转折事件");
});

test("deriveMilestoneMark leaves daily memories unmarked", () => {
  const mark = deriveMilestoneMark(memory({ importance: 2 }));

  assert.equal(mark.isMilestone, false);
});
