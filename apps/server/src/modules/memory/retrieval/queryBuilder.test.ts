import assert from "node:assert/strict";
import test from "node:test";
import { buildRetrievalQueries } from "./queryBuilder.js";

test("memory retrieval query is not polluted by physical sensor state", () => {
  const queries = buildRetrievalQueries(
    "晚上好",
    { focus: "", relationship: "熟悉" },
    []
  );

  assert.doesNotMatch(queries.episode, /缺水|湿度|光照|传感器/);
  assert.match(queries.episode, /晚上好/);
});
