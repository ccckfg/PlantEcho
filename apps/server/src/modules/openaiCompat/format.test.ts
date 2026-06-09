import assert from "node:assert/strict";
import test from "node:test";
import { buildChatCompletion, buildStreamChunk, lastUserText } from "./format.js";
import { plantIdFromModel, plantModelId } from "./plantRoute.js";

test("lastUserText extracts text from modern content parts", () => {
  const text = lastUserText([
    { role: "system", content: "You are helpful." },
    {
      role: "user",
      content: [
        { type: "text", text: "第一段" },
        { type: "image_url" },
        { type: "input_text", input_text: "第二段" }
      ]
    }
  ]);

  assert.equal(text, "第一段\n第二段");
});

test("buildChatCompletion returns OpenAI-style choices and usage", () => {
  const response = buildChatCompletion({
    id: "chatcmpl-test",
    created: 1,
    model: "dyn-plant-pal",
    prompt: "你好",
    result: {
      turn: 1,
      reply: "你好，我在。",
      usedLlm: true,
      usedMemoryIds: [],
      memoryCitations: []
    }
  });

  assert.equal(response.object, "chat.completion");
  assert.equal(response.choices[0]?.message.role, "assistant");
  assert.equal(response.choices[0]?.finish_reason, "stop");
  assert.equal(typeof response.usage.total_tokens, "number");
});

test("buildStreamChunk returns chat.completion.chunk shape", () => {
  const chunk = buildStreamChunk({
    id: "chatcmpl-test",
    created: 1,
    model: "dyn-plant-pal",
    delta: { role: "assistant", content: "" }
  });

  assert.equal(chunk.object, "chat.completion.chunk");
  assert.equal(chunk.choices[0]?.delta.role, "assistant");
  assert.equal(chunk.choices[0]?.finish_reason, null);
});

test("plant model helpers use model as plant route", () => {
  assert.equal(plantModelId("plant-demo"), "plant:plant-demo");
  assert.equal(plantIdFromModel("plant:plant-demo"), "plant-demo");
  assert.equal(plantIdFromModel("gpt-4o"), null);
});
