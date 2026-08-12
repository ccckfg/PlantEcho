import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { proactiveConfig } from "../../config/proactive.js";
import { closeDb, getDb } from "../../db/connection.js";
import { migrate } from "../../db/migrate.js";
import { insertUser } from "../auth/authRepository.js";
import { createPlant } from "../plants/plantRepository.js";
import { consumePlantBudget, getPlantBudget } from "./budgetService.js";
import { markUserOnline, noteUserVisibility } from "./presenceTracker.js";
import { evaluateRuleGate } from "./ruleGate.js";
import { createIntention } from "../intentions/intentionRepository.js";
import { considerOneIntention } from "./intentionProactiveService.js";

const fixture = async () => {
  await migrate();
  const suffix = randomUUID();
  const user = await insertUser({
    id: `proactive-user-${suffix}`,
    username: `proactive-${suffix}`,
    displayName: "主动测试",
    passwordHash: "test",
    role: "user"
  });
  const first = await createPlant({ userId: user.id, name: "甲", species: "绿萝" });
  const second = await createPlant({ userId: user.id, name: "乙", species: "绿萝" });
  return { user, first, second };
};

test("plants owned by one user consume a shared talkativeness budget", async () => {
  const { user, first, second } = await fixture();
  try {
    const initial = await getPlantBudget(first.id);
    for (let index = 0; index < initial.capacity; index += 1) {
      const consumed = await consumePlantBudget(index % 2 ? first.id : second.id);
      assert.ok(consumed);
      assert.equal(consumed?.scopeId, `user:${user.id}`);
    }
    assert.equal(await consumePlantBudget(first.id), null);
  } finally {
    await getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
    await closeDb();
  }
});

test("quiet hours block an online user before the LLM judge", async () => {
  const { user, first } = await fixture();
  const stopOnline = markUserOnline(user.id);
  noteUserVisibility(user.id, true, new Date("2026-08-12T12:00:00.000Z").getTime());
  const originalStart = proactiveConfig.quietStart;
  const originalEnd = proactiveConfig.quietEnd;
  try {
    await getDb().prepare("UPDATE users SET timezone = 'UTC' WHERE id = ?").run(user.id);
    proactiveConfig.quietStart = "00:00";
    proactiveConfig.quietEnd = "23:59";
    const gate = await evaluateRuleGate(first.id, new Date("2026-08-12T12:00:00.000Z"));
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "quiet_hours");
    assert.equal(gate.presence.strength, "strong");
  } finally {
    proactiveConfig.quietStart = originalStart;
    proactiveConfig.quietEnd = originalEnd;
    stopOnline();
    await getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
    await closeDb();
  }
});

test("rule-gated intention consideration is persisted for diagnosis", async () => {
  const { user, first } = await fixture();
  const stopOnline = markUserOnline(user.id);
  noteUserVisibility(user.id, true);
  const originalStart = proactiveConfig.quietStart;
  const originalEnd = proactiveConfig.quietEnd;
  try {
    await getDb().prepare("UPDATE users SET timezone = 'UTC' WHERE id = ?").run(user.id);
    proactiveConfig.quietStart = "00:00";
    proactiveConfig.quietEnd = "23:59";
    const intention = await createIntention({
      plantId: first.id,
      kind: "follow_up",
      content: "问问今天的面试",
      sourceType: "user",
      sourceId: "2",
      priority: 2,
      notBefore: new Date(Date.now() - 1_000).toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString()
    });
    await considerOneIntention(first.id);
    const decision = await getDb().prepare(
      `SELECT gate_result, reason_code FROM proactive_decisions
       WHERE intention_id = ? ORDER BY id DESC LIMIT 1`
    ).get<{ gate_result: string; reason_code: string }>(intention.id);
    assert.equal(decision?.gate_result, "blocked");
    assert.equal(decision?.reason_code, "quiet_hours");
  } finally {
    proactiveConfig.quietStart = originalStart;
    proactiveConfig.quietEnd = originalEnd;
    stopOnline();
    await getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
    await closeDb();
  }
});
