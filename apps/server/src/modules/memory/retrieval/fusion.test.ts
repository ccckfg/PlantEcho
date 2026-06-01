import assert from "node:assert/strict";
import test from "node:test";
import { hybridFusion } from "./fusion.js";

test("hybridFusion combines vector and bm25 relevance", () => {
  const ranked = hybridFusion([
    { id: "a", content: "dry soil", vectorDistance: 0.1, metadata: {} },
    { id: "b", content: "watering", vectorDistance: 1.2, bm25Raw: 10, metadata: {} }
  ], true);
  assert.equal(ranked[0]?.id, "a");
  assert.ok((ranked[0]?.relevance ?? 0) > (ranked[1]?.relevance ?? 0));
});

