import assert from "node:assert/strict";
import test from "node:test";
import {
  episodeClosureOutputSchema,
  episodeMemoryBlockSchema,
  understandingPatchOutputSchema
} from "./outputSchemas.js";

test("memory output schemas reject valid JSON with invalid shapes", () => {
  assert.equal(episodeClosureOutputSchema.safeParse({ 小绿: [{ end_turn: "3" }] }).success, false);
  assert.equal(episodeMemoryBlockSchema.safeParse({ content: 42 }).success, false);
  assert.equal(episodeMemoryBlockSchema.safeParse({ content: "一段记忆", keywords: "浇水" }).success, false);
  assert.equal(understandingPatchOutputSchema.safeParse({ add: [{ subject: "作息", content: 42 }] }).success, false);
});

test("memory output schemas fill safe optional collections", () => {
  assert.deepEqual(
    episodeMemoryBlockSchema.parse({ content: "一段记忆" }).keywords,
    []
  );
  assert.deepEqual(
    understandingPatchOutputSchema.parse({}),
    { add: [], update: {} }
  );
});
