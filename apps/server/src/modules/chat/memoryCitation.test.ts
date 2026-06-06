import assert from "node:assert/strict";
import test from "node:test";
import {
  citationsUsedByReply,
  memoriesAllowedForPrompt,
  memoryCitationsForPrompt,
  repairUnsupportedMemoryClaim,
  UnsupportedMemoryClaimFilter
} from "./memoryCitation.js";
import type { RetrievedMemory } from "../memory/retrieval/retrievalService.js";

const memory = (relevance: number, title = "搬到东窗边"): RetrievedMemory => ({
  memory: {
    id: "m1",
    plantId: "plant",
    date: "2026-05-20",
    time: "09:00",
    location: "",
    participants: "主人",
    title,
    content: "主人把我从客厅搬到东窗边。",
    keywords: ["东窗"],
    importance: 4,
    sourceType: "test",
    rawDialogue: "",
    rawPayload: {},
    lastRecalledAt: "2026-05-20T00:00:00.000Z",
    createdAt: "2026-05-20T00:00:00.000Z"
  },
  score: relevance,
  relevance,
  recency: 1
});

test("memoryCitationsForPrompt offers strong memory for memory intent", () => {
  const citations = memoryCitationsForPrompt("你还记得我把你搬到哪了吗？", [
    memory(0.68)
  ]);
  assert.equal(citations.length, 1);
  assert.equal(citations[0]?.title, "搬到东窗边");
});

test("memoryCitationsForPrompt avoids status-only over citation", () => {
  const citations = memoryCitationsForPrompt("现在湿度和温度怎么样？", [
    memory(0.95)
  ]);
  assert.equal(citations.length, 0);
});

test("prompt only receives memories approved for explicit reference", () => {
  const first = memory(0.8, "允许引用");
  const second = {
    ...memory(0.79, "第二条相关记忆"),
    memory: { ...memory(0.79, "第二条相关记忆").memory, id: "m2" }
  };
  const offered = memoryCitationsForPrompt("你还记得吗？", [first, second]);
  assert.equal(offered.length, 1);
  assert.deepEqual(
    memoriesAllowedForPrompt([first, second], offered).map((item) => item.memory.id),
    ["m1"]
  );
});

test("citationsUsedByReply only marks citation when reply uses a memory cue", () => {
  const offered = memoryCitationsForPrompt("你还记得吗？", [memory(0.8)]);
  assert.equal(citationsUsedByReply("我记得你之前把我搬到东窗边。", offered).length, 1);
  assert.equal(citationsUsedByReply("按当前读数看，状态稳定。", offered).length, 0);
});

test("repairUnsupportedMemoryClaim removes unsupported memory cue", () => {
  assert.equal(
    repairUnsupportedMemoryClaim("我记得你之前说过这件事。", []),
    "按你刚才说的这件事。"
  );
});

test("UnsupportedMemoryClaimFilter repairs memory cues split across stream chunks", () => {
  const filter = new UnsupportedMemoryClaimFilter([]);
  const visible = [
    filter.feed("我记得你之"),
    filter.feed("前说过要搬家，也"),
    filter.feed("记得你上次"),
    filter.finish()
  ].join("");

  assert.equal(visible, "按你刚才说的要搬家，也记得按你刚才说的");
});
