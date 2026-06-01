import assert from "node:assert/strict";
import test from "node:test";
import { distanceToRelevance, finalMemoryScore, importanceScore } from "./scorer.js";

test("distanceToRelevance maps sqlite-vec distance to relevance", () => {
  assert.equal(distanceToRelevance(0), 1);
  assert.equal(distanceToRelevance(2), 0);
});

test("finalMemoryScore respects importance contribution", () => {
  const low = finalMemoryScore(0.5, 0.5, 1);
  const high = finalMemoryScore(0.5, 0.5, 5);
  assert.ok(high > low);
  assert.equal(importanceScore(5), 1);
});

