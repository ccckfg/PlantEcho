# Database

PlantEcho Server uses SQLite. On startup, `migrate()` applies versioned migrations,
seeds demo data when needed, and rebuilds search indexes.

## Migration Flow

Migration files live under:

```text
apps/server/src/db/migrations/
```

The database tracks applied versions in:

```sql
schema_migrations(version, name, applied_at)
```

Startup flow:

```text
open database
-> ensure schema_migrations
-> apply missing migrations in ascending version order
-> seed demo plant/device if absent
-> rebuild FTS/search indexes
```

`001_initial_schema` is intentionally idempotent. It uses the existing
`CREATE TABLE IF NOT EXISTS` baseline, so old development databases can be
opened and marked as version 1 without deleting local data.

## Adding A Migration

1. Add a new file in `apps/server/src/db/migrations/`, for example:

```text
002_add_device_disabled_at.ts
```

2. Export a `DatabaseMigration`:

```ts
export const addDeviceDisabledAtMigration: DatabaseMigration = {
  version: 2,
  name: "add_device_disabled_at",
  up: `
ALTER TABLE devices ADD COLUMN disabled_at TEXT;
`
};
```

3. Add it to `migrations` in `apps/server/src/db/migrations/index.ts`.

4. Run:

```powershell
npm run build
npm run test
```

Use idempotent SQL where SQLite supports it. For destructive changes, add a
copy/rename migration instead of dropping data in place.
