# Database

PlantEcho now uses a database abstraction with two providers:

- `postgres`: recommended for long-running, multi-user deployments. It uses PostgreSQL plus the `pgvector` extension for memory embeddings.
- `sqlite`: local development compatibility mode. It is still useful for tests and single-user experiments, but should not be the production choice for multi-device use.

## Recommended Production Setup

Use PostgreSQL with pgvector:

```dotenv
DB_PROVIDER=postgres
DATABASE_URL=postgresql://dyn:<password>@dyn-postgres:5432/dyn
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000
```

The root `docker-compose.yml` starts a `pgvector/pgvector:pg17` database service and passes `DB_PROVIDER=postgres` plus `DATABASE_URL` to the server.

## What Gets Deleted

Tables are not periodically dropped. The schema is durable and managed by migrations.

Some high-volume historical rows are deleted by the retention worker so the database does not grow forever:

| Table | Default retention | Why |
| --- | ---: | --- |
| `sensor_readings` | 30 days | raw device telemetry grows quickly |
| `sync_events` | 14 days | client sync queue is short-lived |
| `background_jobs` | 14 days for `succeeded` jobs | completed operational records |
| `memory_drafts` | 30 days after `consumed_at` | drafts already consolidated into memories |
| `llm_usage_logs` | 180 days | cost/usage audit window |
| `proactive_event_log` | 90 days | dedupe/audit history |
| `proactive_reminders` | 180 days for `sent`/`cancelled` reminders | completed reminder history |
| `auth_sessions` | 180 days after revoke/expiry | stale login sessions |
| `pending_devices` | 30 days for `claimed`/`ignored` rows | stale device-claim queue |

Core data is not automatically deleted by retention:

- `plants`
- `devices`
- `users`
- `plant_memories`
- `plant_understandings`
- current plant state tables
- unconsumed memory drafts
- queued/running/dead background jobs
- scheduled reminders

Retention runs once when the server starts and then every `RETENTION_CLEANUP_INTERVAL_MS` milliseconds.

## Retention Configuration

```dotenv
RETENTION_CLEANUP_INTERVAL_MS=86400000
RETENTION_SENSOR_RAW_DAYS=30
RETENTION_SYNC_EVENTS_DAYS=14
RETENTION_SUCCEEDED_JOBS_DAYS=14
RETENTION_CONSUMED_DRAFTS_DAYS=30
RETENTION_LLM_USAGE_DAYS=180
RETENTION_PROACTIVE_EVENTS_DAYS=90
RETENTION_FINISHED_REMINDERS_DAYS=180
RETENTION_AUTH_SESSIONS_DAYS=180
RETENTION_PENDING_DEVICES_DAYS=30
```

Increase these values if you need longer audits. Do not set them to very large values without also planning partitioning or archival storage.

## Migrations

SQLite migrations live under:

```text
apps/server/src/db/migrations/
```

PostgreSQL bootstrap schema lives under:

```text
apps/server/src/db/postgres/
```

Both providers track the latest schema version in:

```sql
schema_migrations(version, name, applied_at)
```

Startup flow:

```text
open configured provider
-> apply schema/migrations
-> seed demo plant/device when absent
-> start retention worker
-> start job worker, MQTT, proactive engine
```

## Multi-User Safety Notes

- Chat turn allocation uses `plant_turn_counters` and a transaction. PostgreSQL locks the counter row with `FOR UPDATE`, so concurrent requests do not reuse the same turn.
- Background job claiming uses PostgreSQL `FOR UPDATE SKIP LOCKED`, so multiple workers do not claim the same queued job.
- SQLite transactions are serialized in the local compatibility adapter to keep tests and local development deterministic.
