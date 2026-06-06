import assert from "node:assert/strict";
import test from "node:test";
import { llmPhases, llmTierForPhase } from "./llmRouting.js";

test("simple structured tasks use the secondary model", () => {
  assert.equal(llmTierForPhase(llmPhases.memoryClosure), "secondary");
  assert.equal(llmTierForPhase(llmPhases.memoryEpisode), "secondary");
  assert.equal(llmTierForPhase(llmPhases.plantCareProfile), "secondary");
});

test("speech and long-term understanding use the primary model", () => {
  assert.equal(llmTierForPhase(llmPhases.chatReply), "primary");
  assert.equal(llmTierForPhase(llmPhases.proactiveIntention), "primary");
  assert.equal(llmTierForPhase(llmPhases.proactiveEvent), "primary");
  assert.equal(llmTierForPhase(llmPhases.memoryUnderstanding), "primary");
  assert.equal(llmTierForPhase(), "primary");
});
