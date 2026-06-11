import type { AppUser, AuthApiKeyInfo } from "@dyn/shared";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

type ApiKeyRow = {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  key_last4: string;
  created_at: string;
  rotated_at: string | null;
  last_used_at: string | null;
};

type ApiKeyAuthRow = ApiKeyRow & {
  username: string;
  display_name: string;
  role: AppUser["role"];
  is_active: number;
  user_created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

const toApiKeyInfo = (row: ApiKeyRow): AuthApiKeyInfo => ({
  id: row.id,
  userId: row.user_id,
  prefix: row.key_prefix,
  last4: row.key_last4,
  preview: `${row.key_prefix}...${row.key_last4}`,
  createdAt: row.created_at,
  rotatedAt: row.rotated_at,
  lastUsedAt: row.last_used_at
});

export const getUserApiKeyInfo = async (userId: string): Promise<AuthApiKeyInfo | null> => {
  const row = await getDb()
    .prepare("SELECT * FROM user_api_keys WHERE user_id = ?")
    .get<ApiKeyRow>(userId);
  return row ? toApiKeyInfo(row) : null;
};

export const upsertUserApiKey = (input: {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string;
}): Promise<AuthApiKeyInfo> => {
  return upsertUserApiKeyAsync(input);
};

const upsertUserApiKeyAsync = async (input: {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string;
}): Promise<AuthApiKeyInfo> => {
  const existing = await getUserApiKeyInfo(input.userId);
  const now = nowIso();
  await getDb()
    .prepare(
      `INSERT INTO user_api_keys
       (id, user_id, key_hash, key_prefix, key_last4, created_at, rotated_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
       ON CONFLICT(user_id) DO UPDATE SET
         id = excluded.id,
         key_hash = excluded.key_hash,
         key_prefix = excluded.key_prefix,
         key_last4 = excluded.key_last4,
         rotated_at = ?,
         last_used_at = NULL`
    )
    .run(
      input.id,
      input.userId,
      input.keyHash,
      input.keyPrefix,
      input.keyLast4,
      existing?.createdAt ?? now,
      now
    );
  return (await getUserApiKeyInfo(input.userId))!;
};

export const getApiKeyAuthByHash = (
  keyHash: string
): Promise<{ user: AppUser; apiKey: AuthApiKeyInfo } | null> => {
  return getApiKeyAuthByHashAsync(keyHash);
};

const getApiKeyAuthByHashAsync = async (
  keyHash: string
): Promise<{ user: AppUser; apiKey: AuthApiKeyInfo } | null> => {
  const row = await getDb()
    .prepare(
      `SELECT
         user_api_keys.*,
         users.username,
         users.display_name,
         users.role,
         users.is_active,
         users.created_at AS user_created_at,
         users.updated_at,
         users.last_login_at
       FROM user_api_keys
       JOIN users ON users.id = user_api_keys.user_id
       WHERE user_api_keys.key_hash = ? AND users.is_active = 1`
    )
    .get<ApiKeyAuthRow>(keyHash);
  if (!row) return null;
  return {
    apiKey: toApiKeyInfo(row),
    user: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.user_created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    }
  };
};

export const touchUserApiKey = async (keyHash: string): Promise<void> => {
  await getDb()
    .prepare("UPDATE user_api_keys SET last_used_at = ? WHERE key_hash = ?")
    .run(nowIso(), keyHash);
};
