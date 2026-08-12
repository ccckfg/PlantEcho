import assert from "node:assert/strict";
import test from "node:test";
import { proactiveConfig } from "../../config/proactive.js";
import {
  isUserStronglyPresent,
  markUserOnline,
  noteUserVisibility
} from "./presenceTracker.js";

test("a hidden SSE connection is not strong presence", () => {
  const userId = "presence-hidden-test";
  const disconnect = markUserOnline(userId);
  try {
    noteUserVisibility(userId, true, 1_000);
    assert.equal(isUserStronglyPresent(userId, 1_001), true);
    noteUserVisibility(userId, false, 1_002);
    assert.equal(isUserStronglyPresent(userId, 1_003), false);
  } finally {
    disconnect();
  }
});

test("visible heartbeat expires while SSE remains connected", () => {
  const userId = "presence-expiry-test";
  const disconnect = markUserOnline(userId);
  try {
    noteUserVisibility(userId, true, 2_000);
    assert.equal(isUserStronglyPresent(userId, 2_001), true);
    assert.equal(isUserStronglyPresent(
      userId,
      2_000 + proactiveConfig.visibleHeartbeatTtlMs + 1
    ), false);
  } finally {
    disconnect();
  }
});
