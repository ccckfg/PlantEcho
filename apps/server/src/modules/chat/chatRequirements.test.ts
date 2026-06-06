import assert from "node:assert/strict";
import test from "node:test";
import { missingChatDependencies } from "./chatRequirements.js";

test("chat requires both LLM and embedding APIs", () => {
  assert.deepEqual(missingChatDependencies(true, true), []);
  assert.deepEqual(missingChatDependencies(false, true), ["LLM API"]);
  assert.deepEqual(missingChatDependencies(true, false), ["Embedding API"]);
  assert.deepEqual(missingChatDependencies(false, false), ["LLM API", "Embedding API"]);
});
