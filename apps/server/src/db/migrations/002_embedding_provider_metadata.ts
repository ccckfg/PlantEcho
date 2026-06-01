import type { DatabaseMigration } from "./index.js";

export const embeddingProviderMetadataMigration: DatabaseMigration = {
  version: 2,
  name: "embedding_provider_metadata",
  up: `
ALTER TABLE vector_index_items ADD COLUMN embedding_provider TEXT;
ALTER TABLE vector_index_items ADD COLUMN embedding_model TEXT;
DELETE FROM vector_index_items;
DROP TABLE IF EXISTS memory_vectors;
`
};
