import assert from "node:assert/strict";
import test from "node:test";
import { composeUserPrompt } from "./promptBuilder.js";

test("composeUserPrompt keeps layered state blocks in responsibility order", () => {
  const prompt = composeUserPrompt({
    plant: "plant",
    backgroundInfo: "background",
    careProfile: "care",
    physicalState: "physical",
    innerState: "inner",
    relationshipState: "relationship",
    intentionState: "intention",
    relevantUnderstandings: "understandings",
    relevantMemories: "memories",
    recentHistory: "history",
    userMessage: "hello"
  });
  const order = [
    "<plant>",
    "<plant_background>",
    "<care_profile>",
    "<physical_state>",
    "<inner_state>",
    "<relationship_state>",
    "<intention_state>",
    "<relevant_understandings>",
    "<relevant_memories>",
    "<recent_history>",
    "主人新消息"
  ].map((token) => prompt.indexOf(token));

  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});
