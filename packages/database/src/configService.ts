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
 * - PK: `PLATFORM#{platformName}` - Partition key (shared with platform/environment)
 * - SK: `ENV#{envName}#CONFIG#{timestamp}` - Sort key with ISO-8601 timestamp
 * - GSI_PK: `PLATFORM#{platform}#ENV#{env}#STABLE` - Sparse index for stable versions only
 * - GSI_SK: `TIMESTAMP#{timestamp}` - Enables sorting by timestamp in GSI
 *
 * **Sparse Index Pattern:**
 * Only stable versions (isStable=true) have GSI attributes, reducing index size
 * and costs while enabling efficient queries for latest stable version.
 *
 * **Version Immutability:**
 * Configuration versions are immutable once created. To fix errors, create a new version.
 */

import { Version } from '@togglebox/core';
import { dynamoDBClient, getTableName } from './database';
import { TokenPaginationParams, TokenPaginatedResult } from './interfaces/IPagination';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Creates a new configuration version.
 *
 * @param version - Version object without versionTimestamp and createdAt (auto-generated)
 * @returns Created version with generated timestamps
 *
 * @throws {Error} If version with same timestamp already exists (extremely rare)
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Timestamp Generation:**
 * - versionTimestamp: ISO-8601 timestamp (e.g., "2025-01-15T10:30:45.123Z")
 * - createdAt: Same as versionTimestamp for consistency
 * - Timestamps ensure chronological ordering and uniqueness
 *
 * **Sparse Index for Stable Versions:**
 * When isStable=true, writes additional GSI attributes:
 * - GSI_PK: `PLATFORM#{platform}#ENV#{environment}#STABLE`
 * - GSI_SK: `TIMESTAMP#{versionTimestamp}`
 *
 * This enables efficient queries for latest stable version without scanning all versions.
 * Unstable versions don't have GSI attributes, reducing index size and costs.
 *
 * **Version Immutability:**
 * Once created, versions cannot be modified. To update configuration:
 * 1. Create new version with updated config
 * 2. Mark new version as stable (if ready for production)
 * 3. Optionally delete old versions after grace period
 *
 * @example
 * ```ts
 * // Create unstable version (for testing)
 * const testVersion = await createVersion({
 *   platform: 'web',
 *   environment: 'staging',
 *   config: { apiUrl: 'https://staging-api.example.com' },
 *   isStable: false,
 *   createdBy: 'dev@example.com',
 * });
 *
 * console.log(testVersion.versionTimestamp); // "2025-01-15T10:30:45.123Z"
 * console.log(testVersion.isStable); // false
 *
 * // Create stable version (for production)
 * const prodVersion = await createVersion({
 *   platform: 'web',
 *   environment: 'production',
 *   versionLabel: 'v1.2.3',
 *   config: { apiUrl: 'https://api.example.com', timeout: 5000 },
 *   isStable: true,
 *   createdBy: 'deploy@example.com',
 * });
 *
 * console.log(prodVersion.isStable); // true (has GSI attributes for fast lookup)
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

  // Build item with PK/SK
  const item: Record<string, unknown> = {
    PK: `PLATFORM#${version.platform}`,
    SK: `ENV#${version.environment}#CONFIG#${timestamp}`,
    ...versionWithTimestamp,
  };

  // Add GSI attributes for stable versions (sparse index pattern)
  if (version.isStable) {
    item['GSI_PK'] = `PLATFORM#${version.platform}#ENV#${version.environment}#STABLE`;
    item['GSI_SK'] = `TIMESTAMP#${timestamp}`;
  }

  const params = {
    TableName: getTableName(),
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return versionWithTimestamp;
  } catch (error: unknown) {
    if ((error as any).code === 'ConditionalCheckFailedException') {
      throw new Error(
        `Version with timestamp ${timestamp} already exists (extremely rare collision)`
      );
    }
    throw error;
  }
}

/**
 * Retrieves a specific configuration version by timestamp.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param versionTimestamp - ISO-8601 timestamp of the version
 * @returns Version object if found, null if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Lookup Pattern:**
 * Uses DynamoDB GetItem with exact PK/SK match for optimal performance.
 * Strongly consistent read ensures latest data.
 *
 * **Performance:**
 * - Single-item retrieval (1 RCU)
 * - Sub-10ms latency within same region
 * - No index required (uses primary key)
 *
 * @example
 * ```ts
 * // Fetch specific version by timestamp
 * const version = await getVersion('web', 'production', '2025-01-15T10:30:45.123Z');
 * if (version) {
 *   console.log(version.config); // { apiUrl: '...', timeout: 5000 }
 *   console.log(version.versionLabel); // "v1.2.3"
 * } else {
 *   console.log('Version not found');
 * }
 *
 * // Timestamps must match exactly (case-sensitive, full precision)
 * await getVersion('web', 'production', '2025-01-15T10:30:45.123Z'); // Found
 * await getVersion('web', 'production', '2025-01-15T10:30:45.124Z'); // null (different ms)
 * ```
 */
export async function getVersion(
  platform: string,
  environment: string,
  versionTimestamp: string
): Promise<Version | null> {
  const params = {
    TableName: getTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}#CONFIG#${versionTimestamp}`,
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
 * **Performance Optimization:**
 * Uses Global Secondary Index (StableVersionIndex) for efficient querying.
 * Without GSI, would require FilterExpression on table scan (very expensive!).
 *
 * **Sparse Index Pattern:**
 * Only stable versions have GSI attributes, so:
 * - Index size is smaller (only includes stable versions)
 * - Query is fast (no filtering needed)
 * - Storage costs are lower
 *
 * **Index Configuration:**
 * Requires DynamoDB table to have StableVersionIndex GSI configured with:
 * - Partition key: GSI_PK (String)
 * - Sort key: GSI_SK (String)
 * - Projection: ALL (includes all version attributes)
 *
 * See infrastructure/dynamodb-cloudformation.yml or infrastructure/dynamodb-terraform.tf
 *
 * **Query Pattern:**
 * - GSI_PK = `PLATFORM#{platform}#ENV#{environment}#STABLE`
 * - Sort descending by GSI_SK (timestamp)
 * - Limit 1 (only need latest)
 *
 * @example
 * ```ts
 * // Get latest stable version for production
 * const latestProd = await getLatestStableVersion('web', 'production');
 * if (latestProd) {
 *   console.log(latestProd.versionLabel); // "v1.2.3"
 *   console.log(latestProd.versionTimestamp); // "2025-01-15T10:30:45.123Z"
 *   console.log(latestProd.config); // { apiUrl: '...', ... }
 * } else {
 *   console.log('No stable versions deployed yet');
 * }
 *
 * // Use in client SDK to fetch latest config
 * async function getLatestConfig(platform: string, env: string) {
 *   const version = await getLatestStableVersion(platform, env);
 *   return version?.config || {}; // Fallback to empty config
 * }
 * ```
 */
export async function getLatestStableVersion(
  platform: string,
  environment: string
): Promise<Version | null> {
  const params = {
    TableName: getTableName(),
    IndexName: 'StableVersionIndex', // Use GSI for efficient query
    KeyConditionExpression: 'GSI_PK = :gsiPk',
    ExpressionAttributeValues: {
      ':gsiPk': `PLATFORM#${platform}#ENV#${environment}#STABLE`,
    },
    ScanIndexForward: false, // Sort descending (newest first)
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
 * @returns All versions or paginated result, sorted by timestamp (newest first)
 *
 * @throws {Error} If pagination token is invalid
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Default Behavior (No Pagination):**
 * If `pagination` is `undefined`, fetches ALL versions by automatically paginating
 * through all DynamoDB pages internally. Returns all items in a single response.
 *
 * **Explicit Pagination:**
 * If `pagination` is provided, returns single page with nextToken for manual pagination.
 *
 * **Query Pattern:**
 * - PK = `PLATFORM#{platform}` (exact match)
 * - SK begins_with `ENV#{environment}#CONFIG#` (prefix match)
 * - ScanIndexForward = false (sort descending, newest first)
 *
 * **Sorting:**
 * Results are sorted by timestamp in descending order (newest first).
 * This is efficient because timestamps are part of the sort key.
 *
 * @example
 * ```ts
 * // Fetch ALL versions (no pagination)
 * const allVersions = await listVersions('web', 'production');
 * console.log(allVersions.items.length); // Could be 1000+
 * console.log(allVersions.nextToken); // undefined (all items fetched)
 *
 * // Explicit pagination (first page)
 * const page1 = await listVersions('web', 'production', { limit: 20 });
 * console.log(page1.items.length); // Up to 20
 * console.log(page1.nextToken); // "eyJ..." or undefined
 *
 * // Next page
 * const page2 = await listVersions('web', 'production', {
 *   limit: 20,
 *   nextToken: page1.nextToken
 * });
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
  const params: any = {
    TableName: getTableName(),
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PLATFORM#${platform}`,
      ':sk': `ENV#${environment}#CONFIG#`,
    },
    ScanIndexForward: false, // Sort descending (newest first)
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
    // Note: DynamoDB doesn't provide total count without a separate scan - leave undefined
    total: undefined,
  };
}

/**
 * Deletes a configuration version.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param versionTimestamp - ISO-8601 timestamp of the version to delete
 * @returns true if deleted successfully, false if version doesn't exist
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Deletion Considerations:**
 * - Deletion is permanent and cannot be undone
 * - Consider soft-delete pattern (add `deleted: true` flag) for recovery
 * - Don't delete currently active stable versions
 * - Keep version history for audit/compliance requirements
 *
 * **Best Practices:**
 * Before deleting a version:
 * 1. Verify it's not the current stable version
 * 2. Ensure no clients are actively using it
 * 3. Document reason for deletion in audit logs
 * 4. Consider retention policy (e.g., keep last 30 days)
 *
 * **GSI Cleanup:**
 * DynamoDB automatically removes deleted items from GSI.
 * No manual cleanup needed for sparse index entries.
 *
 * @example
 * ```ts
 * // Delete old unstable version
 * const deleted = await deleteVersion('web', 'staging', '2024-12-01T00:00:00.000Z');
 * if (deleted) {
 *   console.log('Version deleted successfully');
 * } else {
 *   console.log('Version not found (already deleted or never existed)');
 * }
 *
 * // Cleanup old versions (keep last 30 days)
 * const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
 * const allVersions = await listVersions('web', 'production', { limit: 1000 });
 *
 * for (const version of allVersions.items) {
 *   if (!version.isStable && new Date(version.createdAt) < thirtyDaysAgo) {
 *     await deleteVersion('web', 'production', version.versionTimestamp);
 *   }
 * }
 * ```
 */
export async function deleteVersion(
  platform: string,
  environment: string,
  versionTimestamp: string
): Promise<boolean> {
  const params = {
    TableName: getTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}#CONFIG#${versionTimestamp}`,
    },
  };

  try {
    await dynamoDBClient.send(new DeleteCommand(params));
    return true;
  } catch (error: unknown) {
    if ((error as any).code === 'ConditionalCheckFailedException') {
      return false;
    }
    throw error;
  }
}

/**
 * Maps DynamoDB item to Version object by removing DynamoDB-specific fields.
 *
 * @param item - Raw DynamoDB item with PK, SK, and optional GSI fields
 * @returns Version object without DynamoDB keys
 *
 * @remarks
 * Removes internal DynamoDB key fields (PK, SK, GSI_PK, GSI_SK) while
 * preserving all version data. Ensures clean API responses.
 *
 * @example
 * ```ts
 * // DynamoDB item
 * const dbItem = {
 *   PK: 'PLATFORM#web',
 *   SK: 'ENV#production#CONFIG#2025-01-15T10:30:45.123Z',
 *   GSI_PK: 'PLATFORM#web#ENV#production#STABLE',
 *   GSI_SK: 'TIMESTAMP#2025-01-15T10:30:45.123Z',
 *   platform: 'web',
 *   environment: 'production',
 *   versionTimestamp: '2025-01-15T10:30:45.123Z',
 *   versionLabel: 'v1.2.3',
 *   isStable: true,
 *   config: { apiUrl: '...' },
 *   createdBy: 'deploy@example.com',
 *   createdAt: '2025-01-15T10:30:45.123Z',
 * };
 *
 * const version = mapToVersion(dbItem);
 * // => { platform: 'web', environment: 'production', ... }
 * // (PK, SK, GSI_PK, GSI_SK removed)
 * ```
 */
function mapToVersion(item: Record<string, unknown>): Version {
  const { PK, SK, GSI_PK, GSI_SK, ...versionData } = item;
  return versionData as Version;
}
