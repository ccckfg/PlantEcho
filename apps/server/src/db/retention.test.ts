import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("retention cleanup removes expired operational history only", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/retention-${randomUUID()}`;
  const { migrate } = await import("./migrate.js");
  const { closeDb, getDb } = await import("./connection.js");
  const { runRetentionCleanup } = await import("./retention.js");
  const { createPlant } = await import("../modules/plants/plantRepository.js");
  const { insertClaimedDevice } = await import("../modules/devices/deviceRepository.js");

  const now = new Date("2026-06-11T00:00:00.000Z");
  const old = new Date("2025-01-01T00:00:00.000Z").toISOString();
  const recent = new Date("2026-06-10T00:00:00.000Z").toISOString();
  const future = new Date("2026-12-01T00:00:00.000Z").toISOString();

  const count = async (table: string): Promise<number> => {
    const row = await getDb().prepare(`SELECT COUNT(*) AS count FROM ${table}`).get<{ count: number }>();
    return row?.count ?? 0;
  };

  try {
    await migrate();
    const plant = await createPlant({ name: "保留策略测试", species: "绿萝" });
    const deviceId = `retention-device-${randomUUID()}`;
    await insertClaimedDevice(deviceId, plant.id, "Retention ESP32", "hash");

    await getDb().prepare(
      `INSERT INTO sensor_readings
       (device_id, plant_id, captured_at, soil_raw, soil_percent, air_temp_c,
        air_humidity_percent, light_lux, rssi, battery_mv, created_at)
       VALUES (?, ?, ?, 1, 1, 1, 1, 1, -50, NULL, ?), (?, ?, ?, 2, 2, 2, 2, 2, -51, NULL, ?)`
    ).run(deviceId, plant.id, old, old, deviceId, plant.id, recent, recent);
    await getDb().prepare(
      "INSERT INTO sync_events (type, plant_id, payload_json, created_at) VALUES ('x', ?, '{}', ?), ('x', ?, '{}', ?)"
    ).run(plant.id, old, plant.id, recent);
    await getDb().prepare(
      `INSERT INTO background_jobs
       (id, type, status, dedupe_key, payload_json, attempts, max_attempts, run_after,
        locked_at, locked_by, last_error, created_at, updated_at)
       VALUES (?, 'test', 'succeeded', NULL, '{}', 1, 1, ?, NULL, NULL, '', ?, ?),
              (?, 'test', 'queued', NULL, '{}', 0, 1, ?, NULL, NULL, '', ?, ?)`
    ).run(randomUUID(), old, old, old, randomUUID(), old, old, old);
    await getDb().prepare(
      "INSERT INTO memory_drafts (plant_id, turn, text, metadata_json, consumed_at, created_at) VALUES (?, 1, 'old', '{}', ?, ?), (?, 2, 'new', '{}', ?, ?), (?, 3, 'open', '{}', NULL, ?)"
    ).run(plant.id, old, old, plant.id, recent, recent, plant.id, old);
    await getDb().prepare(
      `INSERT INTO llm_usage_logs
       (phase, model_id, prompt_tokens, completion_tokens, total_tokens, token_source, estimated_cost, created_at)
       VALUES ('test', 'm', 1, 1, 2, 'api', 0, ?), ('test', 'm', 1, 1, 2, 'api', 0, ?)`
    ).run(old, recent);
    await getDb().prepare(
      "INSERT INTO proactive_event_log (plant_id, event_key, event_type, severity, message_id, payload_json, fired_at) VALUES (?, 'old', 'reminder.due', 'info', NULL, '{}', ?), (?, 'new', 'reminder.due', 'info', NULL, '{}', ?)"
    ).run(plant.id, old, plant.id, recent);
    await getDb().prepare(
      "INSERT INTO proactive_reminders (id, plant_id, source_message_id, text, remind_at, status, created_at, updated_at) VALUES (?, ?, NULL, 'old', ?, 'sent', ?, ?), (?, ?, NULL, 'new', ?, 'scheduled', ?, ?)"
    ).run(randomUUID(), plant.id, old, old, old, randomUUID(), plant.id, future, recent, recent);
    await getDb().prepare(
      "INSERT INTO pending_devices (id, first_seen_at, last_seen_at, latest_payload_json, rssi, claim_status) VALUES (?, ?, ?, '{}', -50, 'ignored'), (?, ?, ?, '{}', -50, 'pending')"
    ).run(`ignored-${randomUUID()}`, old, old, `pending-${randomUUID()}`, old, old);

    const userId = randomUUID();
    await getDb().prepare(
      `INSERT INTO users
       (id, username, display_name, password_hash, role, is_active, created_at, updated_at, last_login_at)
       VALUES (?, ?, 'User', 'hash', 'user', 1, ?, ?, NULL)`
    ).run(userId, `retention-${randomUUID()}`, old, old);
    await getDb().prepare(
      `INSERT INTO auth_sessions
       (id, user_id, token_hash, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at)
       VALUES (?, ?, ?, '', '', ?, ?, ?, NULL), (?, ?, ?, '', '', ?, ?, ?, ?)`
    ).run(randomUUID(), userId, randomUUID(), old, old, old, randomUUID(), userId, randomUUID(), old, old, future, recent);

    const result = await runRetentionCleanup(now);

    assert.ok(result.totalDeleted >= 8);
    assert.equal(await count("plants"), 2);
    assert.equal(await count("devices"), 2);
    assert.equal(await count("sensor_readings"), 1);
    assert.equal(await count("sync_events"), 1);
    assert.equal(await count("background_jobs"), 1);
    assert.equal(await count("memory_drafts"), 2);
    assert.equal(await count("llm_usage_logs"), 1);
    assert.equal(await count("proactive_event_log"), 1);
    assert.equal(await count("proactive_reminders"), 1);
    assert.equal(await count("pending_devices"), 1);
    assert.equal(await count("auth_sessions"), 1);
  } finally {
    await closeDb();
  }
});
