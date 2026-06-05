import assert from "node:assert/strict";
import test from "node:test";
import { composePromptStatus, composeUserPrompt } from "./promptBuilder.js";
import type { PlantHealthSummary, PlantStatus } from "@dyn/shared";

test("composePromptStatus surfaces sensor offline in status layer", () => {
  const status: PlantStatus = {
    plantId: "p1",
    mood: "舒服",
    relationship: "熟悉主人",
    focus: "记录一下：已晒太阳",
    lastSummary: "旧读数",
    updatedAt: "2026-05-25T09:00:00.000Z"
  };
  const health: PlantHealthSummary = {
    overall: "risk",
    mood: "传感器离线",
    issues: [
      {
        code: "sensor_offline",
        severity: "critical",
        label: "传感器离线",
        detail: "已超过 5 分钟未收到新上报"
      }
    ],
    facts: ["当前没有实时传感器数据"],
    advice: "检查设备"
  };

  const promptStatus = composePromptStatus(status, health);

  assert.equal(promptStatus.mood, "传感器离线");
  assert.equal(promptStatus.focus, "传感器离线");
  assert.equal(promptStatus.lastSummary, "已超过 5 分钟未收到新上报");
  assert.equal(promptStatus.relationship, "熟悉主人");
});

test("composeUserPrompt keeps stable blocks before dynamic sensor state", () => {
  const prompt = composeUserPrompt({
    plant: "plant",
    backgroundInfo: "background",
    careProfile: "care",
    relevantUnderstandings: "understandings",
    relevantMemories: "memories",
    recentHistory: "history",
    status: "status",
    sensorState: "sensor",
    userMessage: "hello"
  });
  const order = [
    "<plant>",
    "<plant_background>",
    "<care_profile>",
    "<relevant_understandings>",
    "<relevant_memories>",
    "<recent_history>",
    "<status>",
    "<sensor_state>",
    "主人新消息"
  ].map((token) => prompt.indexOf(token));

  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});
