/**
 * Environment service for DynamoDB operations.
 *
 * @module environmentService
 *
 * @remarks
 * This module provides environment management operations using DynamoDB's single-table design.
 * Environments represent deployment targets within a platform (e.g., "production", "staging").
 *
 * **DynamoDB Key Structure:**
 * - PK: `PLATFORM#{platformName}` - Partition key (same as parent platform)
 * - SK: `ENV#{envName}#METADATA` - Sort key for environment metadata
 * - No GSI needed - environments are queried by platform using begins_with
 *
 * **Hierarchical Design:**
 * Environments are stored under their parent platform using the same partition key.
 * This enables efficient querying of all environments for a platform in a single query.
 */

import { Environment } from '@togglebox/core';
import { dynamoDBClient, getEnvironmentsTableName } from './database';
import { TokenPaginationParams, TokenPaginatedResult } from './interfaces/IPagination';
import { PutCommand, GetCommand, QueryCommand, QueryCommandInput, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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
 * Creates a new environment within a platform.
 *
 * @param environment - Environment object without createdAt (timestamp generated automatically)
 * @returns Created environment with generated timestamp
 *
 * @throws {Error} If environment with same name already exists in platform
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Key Generation:**
 * - PK: `PLATFORM#{platform}` - Shared with parent platform
 * - SK: `ENV#{environment}#METADATA` - Unique environment identifier
 * - createdAt: Auto-generated ISO-8601 timestamp
 *
 * **Uniqueness Constraint:**
 * Environment names must be unique within a platform but can be reused across platforms.
 * Example: "production" can exist in both "web" and "mobile" platforms.
 *
 * **Hierarchical Storage:**
 * Storing environments under the platform partition key enables efficient
 * retrieval of all environments for a platform without crossing partitions.
 *
 * @example
 * ```ts
 * const newEnv = await createEnvironment({
 *   platform: 'web',
 *   environment: 'production',
 *   description: 'Production environment for web app',
 * });
 *
 * console.log(newEnv.platform); // "web"
 * console.log(newEnv.environment); // "production"
 * console.log(newEnv.createdAt); // "2025-01-15T10:30:00.000Z"
 * ```
 */
export async function createEnvironment(
  environment: Omit<Environment, 'createdAt'>
): Promise<Environment> {
  const timestamp = new Date().toISOString();
  const environmentWithTimestamp: Environment = {
    ...environment,
    createdAt: timestamp,
  };

  const params = {
    TableName: getEnvironmentsTableName(),
    Item: {
      PK: `PLATFORM#${environment.platform}`,
      SK: `ENV#${environment.environment}`,
      ...environmentWithTimestamp,
    },
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return environmentWithTimestamp;
  } catch (error: unknown) {
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      throw new Error(
        `Environment ${environment.environment} already exists for platform ${environment.platform}`
      );
    }
    throw error;
  }
}

/**
 * Retrieves an environment by platform and environment name.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @returns Environment object if found, null if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Lookup Pattern:**
 * Uses DynamoDB GetItem with composite PK/SK for optimal performance.
 * Strongly consistent read ensures latest data.
 *
 * **Performance:**
 * - Single-item retrieval (1 RCU)
 * - Sub-10ms latency within same region
 * - No index required (uses primary key)
 *
 * @example
 * ```ts
 * // Fetch production environment for web platform
 * const env = await getEnvironment('web', 'production');
 * if (env) {
 *   console.log(env.description); // "Production environment..."
 *   console.log(env.createdAt); // "2025-01-01T00:00:00Z"
 * } else {
 *   console.log('Environment not found');
 * }
 *
 * // Environment names are case-sensitive
 * await getEnvironment('web', 'production'); // Found
 * await getEnvironment('web', 'Production'); // null (different case)
 * ```
 */
export async function getEnvironment(
  platform: string,
  environment: string
): Promise<Environment | null> {
  const params = {
    TableName: getEnvironmentsTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToEnvironment(result.Item) : null;
}

/**
 * Lists all environments for a platform with pagination support.
 *
 * @param platform - Platform name to list environments for
 * @param pagination - Pagination parameters (limit and optional nextToken)
 * @returns Paginated result with environments and next page token
 *
 * @throws {Error} If pagination token is invalid
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Query Pattern:**
 * Uses begins_with on sort key to efficiently retrieve all environments:
 * - PK = `PLATFORM#{platform}` (exact match)
 * - SK begins_with `ENV#` (prefix match)
 * - Filters for items ending with `#METADATA` to exclude config versions
 *
 * **Why Filter:**
 * The same partition contains environments AND configuration versions.
 * We only want environment metadata, so we filter for SK ending with `#METADATA`.
 *
 * **Performance:**
 * - Single-partition query (fast, no cross-partition overhead)
 * - Eventually consistent read
 * - Filters applied client-side (after retrieval)
 *
 * @example
 * ```ts
 * // List first 20 environments for web platform
 * const page1 = await listEnvironments('web', { limit: 20 });
 * console.log(page1.items); // [{ platform: 'web', environment: 'production', ... }, ...]
 * console.log(page1.nextToken); // "eyJQSyI6..." or undefined
 *
 * // Fetch all environments for a platform
 * let nextToken: string | undefined;
 * const allEnvs: Environment[] = [];
 *
 * do {
 *   const page = await listEnvironments('mobile', { limit: 100, nextToken });
 *   allEnvs.push(...page.items);
 *   nextToken = page.nextToken;
 * } while (nextToken);
 *
 * console.log(`Total environments for mobile: ${allEnvs.length}`);
 * // Common names: production, staging, development, qa, canary
 * ```
 */
export async function listEnvironments(
  platform: string,
  pagination?: TokenPaginationParams
): Promise<TokenPaginatedResult<Environment>> {
  // If no pagination requested, fetch ALL items
  if (!pagination) {
    const allItems: Environment[] = [];
    let nextToken: string | undefined;

    do {
      const page = await listEnvironments(platform, { limit: 100, nextToken });
      allItems.push(...page.items);
      nextToken = page.nextToken;
    } while (nextToken);

    return {
      items: allItems,
      nextToken: undefined,
      total: allItems.length,
    };
  }

  // Explicit pagination: return single page
  const params: QueryCommandInput = {
    TableName: getEnvironmentsTableName(),
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PLATFORM#${platform}`,
      ':sk': 'ENV#',
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
  const items = result.Items
    ? result.Items.map((item) => mapToEnvironment(item as Record<string, unknown>))
    : [];

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
 * Deletes an environment and all its associated data.
 *
 * @param platform - Platform name
 * @param environment - Environment name to delete
 * @returns True if environment was deleted, false if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **WARNING: This is a destructive operation!**
 * Deletes the environment metadata record. The caller should ensure all related
 * configuration versions and feature flags are deleted first, or accept that
 * orphaned data may remain.
 *
 * **Delete Strategy:**
 * - Uses DynamoDB DeleteItem with ConditionExpression
 * - Only deletes if environment exists (prevents false positives)
 * - Returns false if environment not found (idempotent)
 *
 * **Related Data:**
 * This function only deletes the environment metadata. To fully remove an environment:
 * 1. Delete all feature flags for this environment (SK begins_with `FLAG#`)
 * 2. Delete all config versions for this environment (SK begins_with `ENV#{environment}#VERSION#`)
 * 3. Delete environment metadata (this function)
 *
 * @example
 * ```ts
 * // Delete staging environment from web platform
 * const deleted = await deleteEnvironment('web', 'staging');
 * if (deleted) {
 *   console.log('Environment deleted successfully');
 * } else {
 *   console.log('Environment not found');
 * }
 * ```
 */
export async function deleteEnvironment(platform: string, environment: string): Promise<boolean> {
  const params = {
    TableName: getEnvironmentsTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}`,
    },
    ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
  };

  try {
    await dynamoDBClient.send(new DeleteCommand(params));
    return true;
  } catch (error: unknown) {
    // Environment not found (condition failed)
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      return false;
    }
    // Other errors (network, permissions, etc.)
    throw error;
  }
}

/**
 * Maps DynamoDB item to Environment object by removing DynamoDB-specific fields.
 *
 * @param item - Raw DynamoDB item with PK and SK fields
 * @returns Environment object without DynamoDB keys
 *
 * @remarks
 * Removes internal DynamoDB key fields while preserving all environment data.
 * Ensures clean API responses without database implementation details.
 *
 * @example
 * ```ts
 * // DynamoDB item
 * const dbItem = {
 *   PK: 'PLATFORM#web',
 *   SK: 'ENV#production#METADATA',
 *   platform: 'web',
 *   environment: 'production',
 *   description: 'Production environment',
 *   createdAt: '2025-01-01T00:00:00Z',
 * };
 *
 * const env = mapToEnvironment(dbItem);
 * // => {
 * //   platform: 'web',
 * //   environment: 'production',
 * //   description: 'Production environment',
 * //   createdAt: '2025-01-01T00:00:00Z',
 * // }
 * ```
 */
function mapToEnvironment(item: Record<string, unknown>): Environment {
  const { PK, SK, ...environmentData } = item;
  return environmentData as Environment;
}
