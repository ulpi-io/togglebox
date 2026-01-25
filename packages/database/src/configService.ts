/**
 * Configuration version service for DynamoDB operations.
 *
 * @module configService
 *
 * @remarks
 * This module manages configuration versions using DynamoDB's single-table design with
 * sparse indexing for efficient retrieval of stable versions.
 *
 * **DynamoDB Key Structure:**
 * - PK: `PLATFORM#{platform}#ENV#{environment}` - Partition key
 * - SK: `VERSION#{versionLabel}` - Sort key with semantic version (e.g., "1.0.0")
 * - GSI1PK: `PLATFORM#{platform}#ENV#{environment}#STABLE` - Sparse index for stable versions only
 * - GSI1SK: `{versionTimestamp}` - ISO timestamp for proper chronological ordering
 *
 * **Sparse Index Pattern:**
 * Only stable versions (isStable=true) have GSI attributes, reducing index size
 * and costs while enabling efficient queries for latest stable version.
 *
 * **Semver Sorting:**
 * GSI1SK uses versionTimestamp (not versionLabel) because lexicographic sorting
 * is incorrect for semantic versions (e.g., "1.10.0" < "1.2.0" alphabetically).
 * Timestamp ordering ensures proper chronological "latest" queries.
 *
 * **Version Immutability:**
 * Configuration versions are immutable once created. To fix errors, create a new version.
 */

import { Version } from '@togglebox/configs';
import { dynamoDBClient, getConfigsTableName } from './database';
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
 * Creates a new configuration version.
 *
 * @param version - Version object without versionTimestamp and createdAt (auto-generated)
 * @returns Created version with generated timestamps
 *
 * @throws {Error} If version with same label already exists
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Version Label as Key:**
 * Uses versionLabel (e.g., "1.0.0") as the sort key for human-readable URLs.
 * Each versionLabel must be unique within a platform/environment.
 *
 * **Timestamp Generation:**
 * - versionTimestamp: ISO-8601 timestamp for audit trail
 * - createdAt: Same as versionTimestamp for consistency
 *
 * **Sparse Index for Stable Versions:**
 * When isStable=true, writes additional GSI attributes for efficient lookup.
 *
 * @example
 * ```ts
 * const version = await createVersion({
 *   platform: 'web',
 *   environment: 'production',
 *   versionLabel: '1.0.0',
 *   config: { apiUrl: 'https://api.example.com' },
 *   isStable: true,
 *   createdBy: 'deploy@example.com',
 * });
 * ```
 */
export async function createVersion(
  version: Omit<Version, 'versionTimestamp' | 'createdAt'>
): Promise<Version> {
  const timestamp = new Date().toISOString();
  const versionWithTimestamp: Version = {
    ...version,
    versionTimestamp: timestamp,
    createdAt: timestamp,
  };

  // Build item with PK/SK using versionLabel as the key
  const item: Record<string, unknown> = {
    PK: `PLATFORM#${version.platform}#ENV#${version.environment}`,
    SK: `VERSION#${version.versionLabel}`,
    ...versionWithTimestamp,
  };

  // Add GSI1 attributes for stable versions (sparse index pattern)
  // GSI1SK uses versionTimestamp for proper chronological ordering (not versionLabel)
  // Lexicographic sorting on versionLabel is incorrect for semver (1.10.0 < 1.2.0)
  if (version.isStable) {
    item['GSI1PK'] = `PLATFORM#${version.platform}#ENV#${version.environment}#STABLE`;
    item['GSI1SK'] = timestamp; // Use timestamp for chronological ordering
  }

  const params = {
    TableName: getConfigsTableName(),
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return versionWithTimestamp;
  } catch (error: unknown) {
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      throw new Error(
        `Version ${version.versionLabel} already exists for ${version.platform}/${version.environment}`
      );
    }
    throw error;
  }
}

/**
 * Retrieves a specific configuration version by its semantic version label.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param versionLabel - Semantic version label (e.g., "1.0.0")
 * @returns Version object if found, null if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @example
 * ```ts
 * const version = await getVersion('web', 'production', '1.0.0');
 * if (version) {
 *   console.log(version.config);
 * }
 * ```
 */
export async function getVersion(
  platform: string,
  environment: string,
  versionLabel: string
): Promise<Version | null> {
  const params = {
    TableName: getConfigsTableName(),
    Key: {
      PK: `PLATFORM#${platform}#ENV#${environment}`,
      SK: `VERSION#${versionLabel}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToVersion(result.Item) : null;
}

/**
 * Gets the latest stable version for a platform and environment.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @returns Latest stable version if found, null if no stable versions exist
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * Uses Global Secondary Index (GSI1) for efficient querying of stable versions.
 * Only stable versions have GSI attributes (sparse index pattern).
 *
 * @example
 * ```ts
 * const latestStable = await getLatestStableVersion('web', 'production');
 * if (latestStable) {
 *   console.log(latestStable.versionLabel); // "1.2.0"
 *   console.log(latestStable.config);
 * }
 * ```
 */
export async function getLatestStableVersion(
  platform: string,
  environment: string
): Promise<Version | null> {
  const params = {
    TableName: getConfigsTableName(),
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsiPk',
    ExpressionAttributeValues: {
      ':gsiPk': `PLATFORM#${platform}#ENV#${environment}#STABLE`,
    },
    ScanIndexForward: false, // Sort descending by versionTimestamp (newest first)
    Limit: 1,
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  return result.Items && result.Items.length > 0 ? mapToVersion(result.Items[0]!) : null;
}

/**
 * Lists all configuration versions for an environment with optional pagination.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param pagination - Optional pagination parameters (limit and optional nextToken)
 * @returns All versions or paginated result, sorted by version label descending
 *
 * @throws {Error} If pagination token is invalid
 * @throws {Error} If DynamoDB operation fails
 *
 * @example
 * ```ts
 * // Fetch ALL versions (no pagination)
 * const allVersions = await listVersions('web', 'production');
 *
 * // Paginated
 * const page1 = await listVersions('web', 'production', { limit: 20 });
 * ```
 */
export async function listVersions(
  platform: string,
  environment: string,
  pagination?: TokenPaginationParams
): Promise<TokenPaginatedResult<Version>> {
  // If no pagination requested, fetch ALL items
  if (!pagination) {
    const allItems: Version[] = [];
    let nextToken: string | undefined;

    do {
      const page = await listVersions(platform, environment, {
        limit: 100,
        nextToken
      });
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
    TableName: getConfigsTableName(),
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PLATFORM#${platform}#ENV#${environment}`,
      ':sk': 'VERSION#',
    },
    ScanIndexForward: false, // Sort descending
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
  const items = result.Items ? result.Items.map((item) => mapToVersion(item as Record<string, unknown>)) : [];

  // Encode LastEvaluatedKey as base64 token for next page
  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return {
    items,
    nextToken,
    total: undefined,
  };
}

/**
 * Marks a configuration version as stable.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param versionLabel - Semantic version label (e.g., "1.0.0")
 * @returns Updated version object, or null if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * Updates the isStable flag and adds GSI attributes for stable version lookup.
 */
export async function markVersionStable(
  platform: string,
  environment: string,
  versionLabel: string
): Promise<Version | null> {
  const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');

  // GSI1SK uses versionTimestamp for proper chronological ordering (not versionLabel)
  // Lexicographic sorting on versionLabel is incorrect for semver (1.10.0 < 1.2.0)
  // We reference the existing versionTimestamp attribute in the update expression
  const params = {
    TableName: getConfigsTableName(),
    Key: {
      PK: `PLATFORM#${platform}#ENV#${environment}`,
      SK: `VERSION#${versionLabel}`,
    },
    UpdateExpression: 'SET isStable = :isStable, GSI1PK = :gsiPk, GSI1SK = versionTimestamp',
    ExpressionAttributeValues: {
      ':isStable': true,
      ':gsiPk': `PLATFORM#${platform}#ENV#${environment}#STABLE`,
    },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW' as const,
  };

  try {
    const result = await dynamoDBClient.send(new UpdateCommand(params));
    return result.Attributes ? mapToVersion(result.Attributes as Record<string, unknown>) : null;
  } catch (error: unknown) {
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      return null;
    }
    throw error;
  }
}

/**
 * Deletes a configuration version.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param versionLabel - Semantic version label to delete (e.g., "1.0.0")
 * @returns true if deleted successfully, false if version doesn't exist
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @example
 * ```ts
 * const deleted = await deleteVersion('web', 'staging', '1.0.0-beta');
 * ```
 */
export async function deleteVersion(
  platform: string,
  environment: string,
  versionLabel: string
): Promise<boolean> {
  const params = {
    TableName: getConfigsTableName(),
    Key: {
      PK: `PLATFORM#${platform}#ENV#${environment}`,
      SK: `VERSION#${versionLabel}`,
    },
  };

  try {
    await dynamoDBClient.send(new DeleteCommand(params));
    return true;
  } catch (error: unknown) {
    if (isDynamoDBError(error) && error.name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw error;
  }
}

/**
 * Maps DynamoDB item to Version object by removing DynamoDB-specific fields.
 */
function mapToVersion(item: Record<string, unknown>): Version {
  const { PK, SK, GSI1PK, GSI1SK, ...versionData } = item;
  return versionData as Version;
}
