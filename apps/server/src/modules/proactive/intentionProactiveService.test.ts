import assert from "node:assert/strict";
import test from "node:test";
import { intentionRetryDelayMs } from "../intentions/intentionBackoff.js";
import { validIntentionDecision } from "./intentionProactiveService.js";

test("invalid or failed intention decisions do not count as a decision", () => {
  assert.equal(validIntentionDecision(null), null);
  assert.equal(validIntentionDecision({ action: "speak", reason: "" }), null);
  assert.deepEqual(validIntentionDecision({ action: "keep", reason: "时机未到" }), {
    action: "keep",
    reason: "时机未到"
  });
});

test("failed intention decisions use capped exponential retry backoff", () => {
  assert.equal(intentionRetryDelayMs(1, 1_000, 8_000), 1_000);
  assert.equal(intentionRetryDelayMs(2, 1_000, 8_000), 2_000);
  assert.equal(intentionRetryDelayMs(4, 1_000, 8_000), 8_000);
  assert.equal(intentionRetryDelayMs(8, 1_000, 8_000), 8_000);
});
