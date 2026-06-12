import { initialSchemaMigration } from "./001_initial_schema.js";
import { embeddingProviderMetadataMigration } from "./002_embedding_provider_metadata.js";
import { proactiveEngineMigration } from "./003_proactive_engine.js";
import { usersAndDeviceStatusMigration } from "./004_users_and_device_status.js";
import { authSessionsMigration } from "./005_auth_sessions.js";
import { authSessionRevokeMigration } from "./006_auth_session_revoke.js";
import { plantSoftDeleteMigration } from "./007_plant_soft_delete.js";
import { pendingDeviceUserIdMigration } from "./008_pending_device_user_id.js";
import { deviceConfigDeliveryQueueMigration } from "./009_device_config_delivery_queue.js";
import { proactiveObservationStateMigration } from "./010_proactive_observation_state.js";
import { plantBackgroundInfoMigration } from "./011_plant_background_info.js";
import { layeredPlantStateMigration } from "./012_layered_plant_state.js";
import { llmUsageLogsMigration } from "./013_llm_usage_logs.js";
import { intentionAttemptBackoffMigration } from "./014_intention_attempt_backoff.js";
import { userApiKeysMigration } from "./015_user_api_keys.js";
import { plantStatusTagsMigration } from "./016_plant_status_tags.js";
import { turnCountersAndRetentionMigration } from "./017_turn_counters_and_retention.js";
import { careRecordsMigration } from "./018_care_records.js";
import { plantUserOwnershipMigration } from "./019_plant_user_ownership.js";

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
  deviceConfigDeliveryQueueMigration,
  proactiveObservationStateMigration,
  plantBackgroundInfoMigration,
  layeredPlantStateMigration,
  llmUsageLogsMigration,
  intentionAttemptBackoffMigration,
  userApiKeysMigration,
  plantStatusTagsMigration,
  turnCountersAndRetentionMigration,
  careRecordsMigration,
  plantUserOwnershipMigration
].sort((a, b) => a.version - b.version);

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;
