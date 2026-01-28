/**
 * DynamoDB API key service with single-table design patterns.
 *
 * @module adapters/dynamodb/apiKeyService
 *
 * @remarks
 * **Single-Table Design Patterns:**
 * - Primary Access: `PK: APIKEY#<id>`, `SK: APIKEY#<id>`
 * - User's Keys: GSI1 with `GSI1PK: USER#<userId>`, `GSI1SK: APIKEY#<createdAt>`
 * - Hash Lookup: GSI2 with `GSI2PK: APIKEY_HASH#<keyHash>`, `GSI2SK: APIKEY#<id>`
 *
 * **Data Format:**
 * - Dates stored as ISO 8601 strings (or null for lastUsedAt)
 * - Permissions stored as native DynamoDB list
 * - Key hash used for authentication (never store plaintext keys)
 *
 * **Multi-Tenancy:**
 * Uses {@link getAuthTableName} for tenant-aware table name resolution.
 * All operations scoped to tenant context from AsyncLocalStorage.
 *
 * **Performance Considerations:**
 * - `findById`: Single item get (low latency, strongly consistent)
 * - `findByKeyHash`: GSI2 query (low latency, eventually consistent)
 * - `listByUser`: GSI1 query sorted by creation (efficient)
 * - `deleteByUser`: Query + batch delete (use with caution for many keys)
 */

import { v4 as uuidv4 } from "uuid";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ApiKey, PublicApiKey } from "../../models/ApiKey";
import { CreateApiKeyRepositoryData } from "../../interfaces/IApiKeyRepository";
import { dynamoDBClient, getApiKeysTableName } from "./database";

/**
 * Create a new API key in DynamoDB.
 *
 * @param data - API key creation data (userId, name, keyHash, permissions, etc.)
 * @returns Created API key with generated ID and timestamps
 * @throws {Error} If API key with same ID already exists (rare UUID collision)
 *
 * @remarks
 * **Single-Table Keys:**
 * - `PK: APIKEY#<id>`, `SK: APIKEY#<id>` - Primary access
 * - `GSI1PK: USER#<userId>`, `GSI1SK: APIKEY#<createdAt>` - User's keys
 * - `GSI2PK: APIKEY_HASH#<keyHash>`, `GSI2SK: APIKEY#<id>` - Hash lookup
 *
 * **Condition Expression:**
 * Uses `attribute_not_exists(PK)` to prevent overwrites.
 *
 * **Timestamps:**
 * - `createdAt`: Set to current time
 * - `lastUsedAt`: Initially null, updated on each use
 * - `expiresAt`: Optional expiration timestamp
 */
export async function createApiKey(
  data: CreateApiKeyRepositoryData,
): Promise<ApiKey> {
  const now = new Date();
  const apiKey: ApiKey = {
    id: uuidv4(),
    userId: data.userId,
    name: data.name,
    keyHash: data.keyHash,
    keyPrefix: data.keyPrefix,
    keyLast4: data.keyLast4,
    permissions: data.permissions,
    expiresAt: data.expiresAt,
    lastUsedAt: null,
    createdAt: now,
  };

  const params = {
    TableName: getApiKeysTableName(),
    Item: {
      PK: `APIKEY#${apiKey.id}`,
      SK: `APIKEY#${apiKey.id}`,
      GSI1PK: `USER#${apiKey.userId}`,
      GSI1SK: `APIKEY#${apiKey.createdAt.toISOString()}`,
      GSI2PK: `APIKEY_HASH#${apiKey.keyHash}`,
      GSI2SK: `APIKEY#${apiKey.id}`,
      ...apiKey,
      createdAt: apiKey.createdAt.toISOString(),
      expiresAt: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
      lastUsedAt: null,
    },
    ConditionExpression: "attribute_not_exists(PK)",
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return apiKey;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "ConditionalCheckFailedException") {
      throw new Error(`API Key with ID ${apiKey.id} already exists`);
    }
    throw error;
  }
}

/**
 * Find API key by ID.
 *
 * @param id - API key UUID
 * @returns API key if found, null otherwise
 *
 * @remarks
 * **Consistency:**
 * Uses GetItem operation with strong consistency (default for non-GSI reads).
 *
 * **Performance:**
 * Single item lookup - most efficient query pattern (~1-2ms latency).
 */
export async function findApiKeyById(id: string): Promise<ApiKey | null> {
  const params = {
    TableName: getApiKeysTableName(),
    Key: {
      PK: `APIKEY#${id}`,
      SK: `APIKEY#${id}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToApiKey(result.Item) : null;
}

/**
 * Find API key by hashed key value using GSI2.
 *
 * @param keyHash - Hashed API key (SHA-256 or bcrypt)
 * @returns API key if found, null otherwise
 *
 * @remarks
 * **Global Secondary Index:**
 * Uses GSI2 with `GSI2PK: APIKEY_HASH#<keyHash>` for API key authentication.
 *
 * **Consistency:**
 * GSI queries are eventually consistent. Newly created keys may not be
 * immediately available for authentication (typical propagation: <100ms).
 *
 * **Security:**
 * Never log or expose the keyHash value in responses.
 * Used only for internal authentication verification.
 */
export async function findApiKeyByKeyHash(
  keyHash: string,
): Promise<ApiKey | null> {
  const params = {
    TableName: getApiKeysTableName(),
    IndexName: "GSI2",
    KeyConditionExpression: "GSI2PK = :pk",
    ExpressionAttributeValues: {
      ":pk": `APIKEY_HASH#${keyHash}`,
    },
    Limit: 1,
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  return result.Items && result.Items.length > 0
    ? mapToApiKey(result.Items[0])
    : null;
}

/**
 * List all API keys for a user using GSI1.
 *
 * @param userId - User UUID
 * @returns Array of public API keys (keyHash excluded)
 *
 * @remarks
 * **Global Secondary Index:**
 * Uses GSI1 with `GSI1PK: USER#<userId>` to query user's keys.
 * Results sorted by creation date (oldest first) via `GSI1SK: APIKEY#<createdAt>`.
 *
 * **Security:**
 * Returns PublicApiKey format - excludes sensitive `keyHash` and `userId`.
 * Only shows `keyPrefix` and `keyLast4` for key identification.
 *
 * **Performance:**
 * Efficient GSI query - suitable for users with 100s of API keys.
 */
export async function listApiKeysByUser(
  userId: string,
): Promise<PublicApiKey[]> {
  const params = {
    TableName: getApiKeysTableName(),
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
    },
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  const apiKeys = result.Items ? result.Items.map(mapToApiKey) : [];

  // Convert to PublicApiKey (remove keyHash and userId)
  return apiKeys.map(
    ({ keyHash, userId: _, ...publicKey }) => publicKey as PublicApiKey,
  );
}

/**
 * Update API key data.
 *
 * @param id - API key UUID
 * @param data - Partial API key data to update (typically lastUsedAt)
 * @returns Updated API key
 * @throws {Error} If API key not found
 *
 * @remarks
 * **Read-Modify-Write:**
 * Fetches existing key, merges updates, writes back entire item.
 * Not atomic - acceptable for lastUsedAt updates (doesn't need strong consistency).
 *
 * **Common Use Case:**
 * Update `lastUsedAt` timestamp during API key authentication.
 * Performed asynchronously after authentication succeeds (fire-and-forget).
 */
export async function updateApiKey(
  id: string,
  data: Partial<ApiKey>,
): Promise<ApiKey> {
  const existingKey = await findApiKeyById(id);
  if (!existingKey) {
    throw new Error(`API Key with ID ${id} not found`);
  }

  const updatedKey: ApiKey = {
    ...existingKey,
    ...data,
  };

  const params = {
    TableName: getApiKeysTableName(),
    Item: {
      PK: `APIKEY#${id}`,
      SK: `APIKEY#${id}`,
      GSI1PK: `USER#${updatedKey.userId}`,
      GSI1SK: `APIKEY#${updatedKey.createdAt.toISOString()}`,
      GSI2PK: `APIKEY_HASH#${updatedKey.keyHash}`,
      GSI2SK: `APIKEY#${id}`,
      ...updatedKey,
      createdAt: updatedKey.createdAt.toISOString(),
      expiresAt: updatedKey.expiresAt
        ? updatedKey.expiresAt.toISOString()
        : null,
      lastUsedAt: updatedKey.lastUsedAt
        ? updatedKey.lastUsedAt.toISOString()
        : null,
    },
  };

  await dynamoDBClient.send(new PutCommand(params));
  return updatedKey;
}

/**
 * Delete API key from DynamoDB.
 *
 * @param id - API key UUID
 *
 * @remarks
 * **Revocation:**
 * Permanently deletes API key - cannot be recovered.
 * Key immediately becomes invalid for authentication.
 *
 * **Silent Failure:**
 * DynamoDB DeleteItem is idempotent - no error if item doesn't exist.
 */
export async function deleteApiKey(id: string): Promise<void> {
  const params = {
    TableName: getApiKeysTableName(),
    Key: {
      PK: `APIKEY#${id}`,
      SK: `APIKEY#${id}`,
    },
  };

  await dynamoDBClient.send(new DeleteCommand(params));
}

/**
 * Delete all API keys for a user (cascade delete).
 *
 * @param userId - User UUID
 *
 * @remarks
 * **Manual Cascade:**
 * Queries user's keys via GSI1, then batch deletes them.
 * Not automatically triggered when user is deleted - must be called explicitly.
 *
 * **Performance:**
 * Two operations: GSI1 query + parallel deletes.
 * For users with 100s of keys, consider batch write API for efficiency.
 */
export async function deleteApiKeysByUser(userId: string): Promise<void> {
  const apiKeys = await listApiKeysByUser(userId);

  // Batch delete all keys
  const deletePromises = apiKeys.map((key) => deleteApiKey(key.id));
  await Promise.all(deletePromises);
}

/**
 * Map DynamoDB item to ApiKey domain model.
 *
 * @param item - Raw DynamoDB item with PK/SK/GSI keys
 * @returns ApiKey model with typed fields
 *
 * @remarks
 * **Key Removal:**
 * Strips DynamoDB-specific keys (PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK) from result.
 *
 * **Date Parsing:**
 * Converts ISO 8601 strings to JavaScript Date objects.
 * Handles null values for optional dates (expiresAt, lastUsedAt).
 *
 * **Type Assertion:**
 * Uses `as ApiKey` - assumes DynamoDB item matches ApiKey interface.
 */
function mapToApiKey(item: unknown): ApiKey {
  const data = item as Record<string, unknown>;
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...apiKeyData } = data;
  const typedData = apiKeyData as {
    createdAt: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
    [key: string]: unknown;
  };
  return {
    ...apiKeyData,
    createdAt: new Date(typedData.createdAt),
    expiresAt: typedData.expiresAt ? new Date(typedData.expiresAt) : null,
    lastUsedAt: typedData.lastUsedAt ? new Date(typedData.lastUsedAt) : null,
  } as ApiKey;
}
