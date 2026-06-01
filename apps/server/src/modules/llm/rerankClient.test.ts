import assert from "node:assert/strict";
import test from "node:test";
import { parseRerankScores } from "./rerankClient.js";

test("parseRerankScores maps Qwen/SiliconFlow rerank indices back to document ids", () => {
  const scores = parseRerankScores(
    {
      results: [
        { index: 2, relevance_score: 0.91 },
        { index: 0, relevance_score: 0.42 }
      ]
    },
    [
      { id: "a", text: "alpha" },
      { id: "b", text: "beta" },
      { id: "c", text: "gamma" }
    ]
  );

  assert.deepEqual(scores, [
    { id: "c", score: 0.91 },
    { id: "a", score: 0.42 }
  ]);
});

