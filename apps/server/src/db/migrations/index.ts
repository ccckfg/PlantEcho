import { initialSchemaMigration } from "./001_initial_schema.js";
import { embeddingProviderMetadataMigration } from "./002_embedding_provider_metadata.js";
import { proactiveEngineMigration } from "./003_proactive_engine.js";
import { usersAndDeviceStatusMigration } from "./004_users_and_device_status.js";
import { authSessionsMigration } from "./005_auth_sessions.js";
import { authSessionRevokeMigration } from "./006_auth_session_revoke.js";
import { plantSoftDeleteMigration } from "./007_plant_soft_delete.js";
import { pendingDeviceUserIdMigration } from "./008_pending_device_user_id.js";
import { deviceConfigDeliveryQueueMigration } from "./009_device_config_delivery_queue.js";

export interface DatabaseMigration {
  version: number;
  name: string;
  up: string;
}

export const migrations: DatabaseMigration[] = [
  initialSchemaMigration,
  embeddingProviderMetadataMigration,
  proactiveEngineMigration,
  usersAndDeviceStatusMigration,
  authSessionsMigration,
  authSessionRevokeMigration,
  plantSoftDeleteMigration,
  pendingDeviceUserIdMigration,
  deviceConfigDeliveryQueueMigration
].sort((a, b) => a.version - b.version);

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;
