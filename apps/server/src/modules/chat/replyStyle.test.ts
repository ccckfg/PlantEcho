import assert from "node:assert/strict";
import test from "node:test";
import { dialogueConfig } from "../../config/dialogue.js";
import { limitPlantReply, replyCharLimit } from "./replyStyle.js";

test("daily plant replies keep their full visible text", () => {
  const reply = "这是一段很长的话。".repeat(20);

  assert.equal(replyCharLimit("今天怎么样"), dialogueConfig.defaultReplyMaxChars);
  assert.equal(limitPlantReply(reply, "今天怎么样"), reply);
});

test("explicit detail requests allow a longer reply", () => {
  assert.equal(replyCharLimit("详细解释一下读数"), dialogueConfig.detailedReplyMaxChars);
});
