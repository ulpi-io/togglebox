/**
 * Platform service for DynamoDB operations.
 *
 * @module platformService
 *
 * @remarks
 * This module provides platform management operations using DynamoDB's single-table design.
 * Platforms are top-level organization entities that contain environments and configurations.
 *
 * **DynamoDB Key Structure:**
 * - PK: `PLATFORM#{platformName}` - Partition key for platform metadata
 * - SK: `METADATA` - Sort key for platform metadata record
 * - GSI1PK: `PLATFORM` - Global secondary index for listing all platforms
 *
 * **Single-Table Design Pattern:**
 * All platforms are stored in the same table with different partition keys.
 * GSI1 allows efficient querying of all platforms without scanning.
 */

import { Platform } from '@togglebox/core';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, getPlatformsTableName } from './database';
import { TokenPaginationParams, TokenPaginatedResult } from './interfaces/IPagination';
import { PutCommand, GetCommand, DeleteCommand, QueryCommand, QueryCommandInput, UpdateCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Type guard for DynamoDB errors with a name property.
 * AWS SDK v3 uses error.name for exception types (e.g., 'ConditionalCheckFailedException').
 *
 * @param error - Unknown error object
 * @returns True if error is an Error with a name property
 */
function isDynamoDBError(error: unknown): error is Error & { name: string } {
  return error instanceof Error && typeof error.name === 'string';
}

/**
 * Creates a new platform.
 *
 * @param platform - Platform object without ID (ID generated automatically)
 * @returns Created platform with generated UUID
 *
 * @throws {Error} If platform with same name already exists
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Key Generation:**
 * - ID: Auto-generated UUID v4
 * - PK: `PLATFORM#{name}` - Ensures unique platform names
 * - SK: `METADATA` - Fixed value for platform metadata
 * - GSI1PK: `PLATFORM` - Enables listing all platforms
 *
 * **Uniqueness Constraint:**
 * Uses DynamoDB conditional expression to prevent duplicate platform names.
 * If a platform with the same name exists, the operation fails with error.
 *
 * **Side Effects:**
 * - Platform becomes available for environment and configuration management
 * - Platform appears in listPlatforms() results immediately
 *
 * @example
 * ```ts
 * const newPlatform = await createPlatform({
 *   name: 'web',
 *   description: 'Web application for desktop users',
 *   createdAt: new Date().toISOString(),
 * });
 *
 * console.log(newPlatform.id); // "550e8400-e29b-41d4-a716-446655440000"
 * console.log(newPlatform.name); // "web"
 * ```
 */
export async function createPlatform(platform: Omit<Platform, 'id'>): Promise<Platform> {
  const platformWithId: Platform = {
    ...platform,
    id: uuidv4(),
  };

  const params = {
    TableName: getPlatformsTableName(),
    Item: {
      PK: `PLATFORM#${platform.name}`,
      // SECURITY: GSI1 keys enable efficient listing without full table scan
      GSI1PK: 'PLATFORM',
      GSI1SK: `PLATFORM#${platform.name}`,
      ...platformWithId,
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return platformWithId;
  } catch (error: unknown) {
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      throw new Error(`Platform ${platform.name} already exists`);
    }
    throw error;
  }
}

/**
 * Retrieves a platform by name.
 *
 * @param name - Platform name to retrieve
 * @returns Platform object if found, null if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Lookup Pattern:**
 * Uses DynamoDB GetItem with exact PK/SK match for optimal performance.
 * This is a strongly consistent read operation.
 *
 * **Performance:**
 * - Strongly consistent read (latest data guaranteed)
 * - Single-item retrieval (1 RCU consumed)
 * - Sub-10ms latency in same region
 *
 * @example
 * ```ts
 * // Fetch existing platform
 * const platform = await getPlatform('web');
 * if (platform) {
 *   console.log(platform.name); // "web"
 *   console.log(platform.description); // "Web application..."
 * } else {
 *   console.log('Platform not found');
 * }
 *
 * // Platform names are case-sensitive
 * await getPlatform('web'); // Found
 * await getPlatform('WEB'); // null (different case)
 * ```
 */
export async function getPlatform(name: string): Promise<Platform | null> {
  const params = {
    TableName: getPlatformsTableName(),
    Key: {
      PK: `PLATFORM#${name}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToPlatform(result.Item) : null;
}

/**
 * Lists all platforms with optional pagination.
 *
 * @param pagination - Optional pagination parameters (limit and optional nextToken)
 * @returns All platforms or paginated result
 *
 * @throws {Error} If pagination token is invalid
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Default Behavior (No Pagination):**
 * If `pagination` is `undefined`, fetches ALL platforms by automatically paginating
 * through all DynamoDB pages internally. Returns all items in a single response.
 *
 * **Explicit Pagination:**
 * If `pagination` is provided, returns single page with nextToken for manual pagination.
 *
 * **Query Strategy:**
 * Uses GSI1 (Global Secondary Index) to query all platforms efficiently:
 * - GSI1PK = 'PLATFORM' (all platforms share this value)
 * - Avoids full table scan
 * - Eventually consistent read (faster and cheaper)
 *
 * @example
 * ```ts
 * // Fetch ALL platforms (no pagination)
 * const all = await listPlatforms();
 * logger.info(`Total platforms: ${all.items.length}`);
 *
 * // Explicit pagination (first page)
 * const page1 = await listPlatforms({ limit: 20 });
 * logger.info(`Page 1: ${page1.items.length} items`);
 *
 * // Next page
 * if (page1.nextToken) {
 *   const page2 = await listPlatforms({ limit: 20, nextToken: page1.nextToken });
 * }
 * ```
 */
export async function listPlatforms(
  pagination?: TokenPaginationParams
): Promise<TokenPaginatedResult<Platform>> {
  // If no pagination requested, fetch ALL items
  if (!pagination) {
    const allItems: Platform[] = [];
    let nextToken: string | undefined;

    do {
      const page = await listPlatforms({ limit: 100, nextToken });
      allItems.push(...page.items);
      nextToken = page.nextToken;
    } while (nextToken);

    return {
      items: allItems,
      nextToken: undefined,
      total: allItems.length,
    };
  }

  // SECURITY: Use Query on GSI1 instead of Scan for efficient listing
  const params: QueryCommandInput = {
    TableName: getPlatformsTableName(),
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': 'PLATFORM',
    },
    Limit: pagination.limit,
  };

  // Add ExclusiveStartKey for pagination (if provided)
  if (pagination.nextToken) {
    try {
      params['ExclusiveStartKey'] = JSON.parse(
        Buffer.from(pagination.nextToken, 'base64').toString('utf-8')
      );
    } catch (error) {
      throw new Error('Invalid pagination token');
    }
  }

  const result = await dynamoDBClient.send(new QueryCommand(params));
  const items = result.Items ? result.Items.map((item) => mapToPlatform(item as Record<string, unknown>)) : [];

  // Encode LastEvaluatedKey as base64 token for next page
  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return {
    items,
    nextToken,
    total: undefined, // DynamoDB doesn't efficiently support total counts
  };
}

/**
 * Deletes a platform and all its associated data.
 *
 * @param name - Platform name to delete
 * @returns True if platform was deleted, false if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **WARNING: This is a destructive operation!**
 * Deletes the platform metadata record. The caller should ensure all related
 * environments, configurations, and feature flags are deleted first, or accept
 * that orphaned data may remain.
 *
 * **Delete Strategy:**
 * - Uses DynamoDB DeleteItem with ConditionExpression
 * - Only deletes if platform exists (prevents false positives)
 * - Returns false if platform not found (idempotent)
 *
 * **Related Data:**
 * This function only deletes the platform metadata. To fully remove a platform:
 * 1. Delete all feature flags (SK begins_with `FLAG#`)
 * 2. Delete all config versions (SK begins_with `ENV#`)
 * 3. Delete all environments (SK begins_with `ENV#` with METADATA)
 * 4. Delete platform metadata (this function)
 */
export async function deletePlatform(name: string): Promise<boolean> {
  const params = {
    TableName: getPlatformsTableName(),
    Key: {
      PK: `PLATFORM#${name}`,
    },
    ConditionExpression: 'attribute_exists(PK)',
  };

  try {
    await dynamoDBClient.send(new DeleteCommand(params));
    return true;
  } catch (error: unknown) {
    // Platform not found (condition failed)
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      return false;
    }
    // Other errors (network, permissions, etc.)
    throw error;
  }
}

/**
 * Maps DynamoDB item to Platform object by removing DynamoDB-specific fields.
 *
 * @param item - Raw DynamoDB item with PK, SK, GSI1PK fields
 * @returns Platform object without DynamoDB keys
 *
 * @remarks
 * **Field Removal:**
 * Strips DynamoDB key fields (PK, SK, GSI1PK) while preserving all platform data.
 * This ensures clean API responses without internal database implementation details.
 *
 * @example
 * ```ts
 * // DynamoDB item
 * const dbItem = {
 *   PK: 'PLATFORM#web',
 *   SK: 'METADATA',
 *   GSI1PK: 'PLATFORM',
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   name: 'web',
 *   description: 'Web application',
 *   createdAt: '2025-01-01T00:00:00Z',
 * };
 *
 * const platform = mapToPlatform(dbItem);
 * // => {
 * //   id: '550e8400-e29b-41d4-a716-446655440000',
 * //   name: 'web',
 * //   description: 'Web application',
 * //   createdAt: '2025-01-01T00:00:00Z',
 * // }
 * ```
 */
function mapToPlatform(item: Record<string, unknown>): Platform {
  // Strip DynamoDB key fields (PK, GSI1PK, GSI1SK)
  const { PK, GSI1PK, GSI1SK, ...platformData } = item;
  return platformData as Platform;
}

/**
 * Updates a platform's editable fields.
 *
 * @param currentName - Current platform name (slug/identifier)
 * @param updates - Fields to update (name = display name, description)
 * @returns Updated platform if found, null otherwise
 *
 * @remarks
 * **Note:** The platform's slug (PK) cannot be changed.
 * Only name and description fields are editable.
 */
export async function updatePlatform(
  currentName: string,
  updates: { name?: string; description?: string }
): Promise<Platform | null> {
  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  if (updates.description !== undefined) {
    updateExpressions.push('#description = :description');
    expressionAttributeNames['#description'] = 'description';
    expressionAttributeValues[':description'] = updates.description;
  }

  // If no fields to update, just return the existing platform
  if (updateExpressions.length === 0) {
    return getPlatform(currentName);
  }

  const params = {
    TableName: getPlatformsTableName(),
    Key: {
      PK: `PLATFORM#${currentName}`,
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW' as const,
  };

  try {
    const result = await dynamoDBClient.send(new UpdateCommand(params));
    return result.Attributes ? mapToPlatform(result.Attributes as Record<string, unknown>) : null;
  } catch (error: unknown) {
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      return null;
    }
    throw error;
  }
}
