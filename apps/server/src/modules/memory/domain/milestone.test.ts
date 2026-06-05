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

test("deriveMilestoneMark marks exceptional memories", () => {
  const mark = deriveMilestoneMark(memory({ importance: 5 }));

  assert.equal(mark.isMilestone, true);
  assert.equal(mark.milestoneReason, "难得的重要时刻");
});

test("deriveMilestoneMark ignores routine sensor events", () => {
  const mark = deriveMilestoneMark(memory({ sourceType: "sensor:soil_low", importance: 5 }));

  assert.equal(mark.isMilestone, false);
});

test("deriveMilestoneMark requires a meaningful transition at importance four", () => {
  const mark = deriveMilestoneMark(memory({
    importance: 4,
    title: "第一次长出新叶",
    content: "我和主人一起看见了第一片新叶。"
  }));

  assert.equal(mark.isMilestone, true);
  assert.equal(mark.milestoneReason, "真正发生了转折");
});

test("deriveMilestoneMark leaves ordinary importance four memories unmarked", () => {
  const mark = deriveMilestoneMark(memory({ importance: 4, title: "今天浇了水" }));

  assert.equal(mark.isMilestone, false);
});

test("deriveMilestoneMark leaves daily memories unmarked", () => {
  const mark = deriveMilestoneMark(memory({ importance: 2 }));

  assert.equal(mark.isMilestone, false);
});
