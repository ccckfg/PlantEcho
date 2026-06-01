import assert from "node:assert/strict";
import test from "node:test";
import { resolveUnderstandingId } from "./consolidationInputs.js";
import type { Understanding } from "../domain/types.js";

const understandings: Understanding[] = [
  {
    id: "abc123",
    plantId: "p1",
    subject: "主人的近况",
    content: "主人最近有点累",
    keywords: ["主人"],
    linkedMemories: [],
    history: [],
    updatedAt: new Date().toISOString()
  }
];

test("resolveUnderstandingId supports prompt ids and prefixes", () => {
  assert.equal(resolveUnderstandingId("u1", understandings), "abc123");
  assert.equal(resolveUnderstandingId("abc", understandings), "abc123");
  assert.equal(resolveUnderstandingId("missing", understandings), null);
});

