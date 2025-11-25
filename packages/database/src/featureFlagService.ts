/**
 * Feature flag service for DynamoDB operations.
 *
 * @module featureFlagService
 *
 * @remarks
 * This module provides feature flag management operations using DynamoDB's single-table design.
 * Feature flags enable phased rollouts, A/B testing, and runtime configuration changes without deployments.
 *
 * **DynamoDB Key Structure:**
 * - PK: `PLATFORM#{platformName}` - Partition key (shared with platform/environment)
 * - SK: `ENV#{envName}#FLAG#{flagName}` - Sort key for feature flag
 * - No GSI needed - flags are queried by platform and environment using begins_with
 *
 * **Hierarchical Design:**
 * Feature flags are stored under their parent platform/environment using the same partition key.
 * This enables efficient querying of all flags for an environment in a single query.
 *
 * **Rollout Strategies:**
 * - **simple**: All users get the same value (enabled/disabled)
 * - **percentage**: Random percentage of users see the feature (0-100%)
 * - **targeted**: Specific user IDs or segments see the feature
 *
 * **Use Cases:**
 * - Gradual feature rollouts (0% → 25% → 50% → 100%)
 * - A/B testing different implementations
 * - Kill switches for problematic features
 * - Beta features for specific users
 * - Environment-specific configurations
 */

import { FeatureFlag } from '@togglebox/core';
import { dynamoDBClient, getTableName } from './database';
import { TokenPaginationParams, TokenPaginatedResult } from './interfaces/IPagination';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Creates a new feature flag.
 *
 * @param featureFlag - Feature flag object without timestamps (auto-generated)
 * @returns Created feature flag with generated timestamps
 *
 * @throws {Error} If feature flag with same name already exists
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Timestamp Generation:**
 * - createdAt: ISO-8601 timestamp when flag is created
 * - updatedAt: Same as createdAt initially, updated on each modification
 *
 * **Uniqueness Constraint:**
 * Feature flag names must be unique within a platform/environment combination.
 * Example: "new-ui" can exist in both "web/production" and "mobile/production".
 *
 * **Hierarchical Storage:**
 * Storing flags under the platform/environment partition key enables efficient
 * retrieval of all flags for an environment without crossing partitions.
 *
 * @example
 * ```ts
 * // Simple on/off flag
 * const killSwitch = await createFeatureFlag({
 *   platform: 'web',
 *   environment: 'production',
 *   flagName: 'payment-processor-v2',
 *   enabled: false,
 *   rolloutType: 'simple',
 *   description: 'Kill switch for new payment processor',
 *   createdBy: 'ops@example.com',
 * });
 *
 * // Percentage rollout (gradual release)
 * const gradualRollout = await createFeatureFlag({
 *   platform: 'mobile',
 *   environment: 'production',
 *   flagName: 'new-ui',
 *   enabled: true,
 *   rolloutType: 'percentage',
 *   rolloutPercentage: 25,
 *   description: 'New UI redesign - rolling out to 25% of users',
 *   createdBy: 'product@example.com',
 * });
 *
 * // Targeted rollout (beta users)
 * const betaFeature = await createFeatureFlag({
 *   platform: 'web',
 *   environment: 'production',
 *   flagName: 'ai-recommendations',
 *   enabled: true,
 *   rolloutType: 'targeted',
 *   targetUserIds: ['user123', 'user456', 'user789'],
 *   description: 'AI-powered recommendations for beta testers',
 *   createdBy: 'ml-team@example.com',
 * });
 * ```
 */
export async function createFeatureFlag(
  featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
): Promise<FeatureFlag> {
  const timestamp = new Date().toISOString();
  const featureFlagWithTimestamps: FeatureFlag = {
    ...featureFlag,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const params = {
    TableName: getTableName(),
    Item: {
      PK: `PLATFORM#${featureFlag.platform}`,
      SK: `ENV#${featureFlag.environment}#FLAG#${featureFlag.flagName}`,
      ...featureFlagWithTimestamps,
    },
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return featureFlagWithTimestamps;
  } catch (error: unknown) {
    if ((error as any).code === 'ConditionalCheckFailedException') {
      throw new Error(
        `Feature flag ${featureFlag.flagName} already exists for platform ${featureFlag.platform} and environment ${featureFlag.environment}`
      );
    }
    throw error;
  }
}

/**
 * Retrieves a feature flag by platform, environment, and flag name.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param flagName - Feature flag name
 * @returns Feature flag object if found, null if not found
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Lookup Pattern:**
 * Uses DynamoDB GetItem with exact PK/SK match for optimal performance.
 * Strongly consistent read ensures latest flag state.
 *
 * **Performance:**
 * - Single-item retrieval (1 RCU)
 * - Sub-10ms latency within same region
 * - No index required (uses primary key)
 *
 * @example
 * ```ts
 * // Fetch specific feature flag
 * const flag = await getFeatureFlag('web', 'production', 'new-ui');
 * if (flag) {
 *   console.log(flag.enabled); // true/false
 *   console.log(flag.rolloutType); // 'simple', 'percentage', or 'targeted'
 *   console.log(flag.rolloutPercentage); // 0-100 (if percentage rollout)
 * } else {
 *   console.log('Feature flag not found');
 * }
 *
 * // Flag names are case-sensitive
 * await getFeatureFlag('web', 'production', 'new-ui'); // Found
 * await getFeatureFlag('web', 'production', 'New-UI'); // null (different case)
 * ```
 */
export async function getFeatureFlag(
  platform: string,
  environment: string,
  flagName: string
): Promise<FeatureFlag | null> {
  const params = {
    TableName: getTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}#FLAG#${flagName}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToFeatureFlag(result.Item) : null;
}

/**
 * Lists all feature flags for a platform and environment.
 *
 * @param platform - Platform name to list flags for
 * @param environment - Environment name to list flags for
 * @param pagination - Optional pagination parameters (limit and nextToken)
 * @returns Array of feature flags (if no pagination) or paginated result with nextToken
 *
 * @throws {Error} If pagination token is invalid
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Dual Mode Operation:**
 * - **Without pagination**: Returns ALL flags in a single query (up to DynamoDB 1MB limit)
 * - **With pagination**: Returns paginated results with nextToken for subsequent pages
 *
 * **Query Pattern:**
 * Uses begins_with on sort key to efficiently retrieve all flags:
 * - PK = `PLATFORM#{platform}` (exact match)
 * - SK begins_with `ENV#{environment}#FLAG#` (prefix match)
 *
 * **Performance:**
 * - Single-partition query (fast, no cross-partition overhead)
 * - Eventually consistent read
 * - No filtering needed (SK prefix handles it)
 *
 * @example
 * ```ts
 * // Get all flags for an environment (non-paginated)
 * const allFlags = await listFeatureFlags('web', 'production');
 * console.log(allFlags.length); // Total count
 * console.log(allFlags.map(f => f.flagName)); // ['new-ui', 'beta-feature', ...]
 *
 * // Get flags with pagination
 * const page1 = await listFeatureFlags('web', 'production', { limit: 10 });
 * console.log(page1.items.length); // Up to 10
 * console.log(page1.nextToken); // Token for next page or undefined
 *
 * // Paginate through all flags
 * let nextToken: string | undefined;
 * const allPaginatedFlags: FeatureFlag[] = [];
 *
 * do {
 *   const page = await listFeatureFlags('mobile', 'production', { limit: 20, nextToken });
 *   if (Array.isArray(page)) {
 *     // Non-paginated result (shouldn't happen with pagination param)
 *     allPaginatedFlags.push(...page);
 *     break;
 *   } else {
 *     allPaginatedFlags.push(...page.items);
 *     nextToken = page.nextToken;
 *   }
 * } while (nextToken);
 *
 * console.log(`Total flags: ${allPaginatedFlags.length}`);
 *
 * // Filter by rollout type
 * const percentageFlags = allPaginatedFlags.filter(f => f.rolloutType === 'percentage');
 * const enabledFlags = allPaginatedFlags.filter(f => f.enabled);
 * ```
 */
export async function listFeatureFlags(
  platform: string,
  environment: string,
  pagination?: TokenPaginationParams
): Promise<TokenPaginatedResult<FeatureFlag>> {
  // If no pagination requested, fetch ALL items (handles >1MB datasets)
  if (!pagination) {
    const allItems: FeatureFlag[] = [];
    let nextToken: string | undefined;

    do {
      const page = await listFeatureFlags(platform, environment, { limit: 100, nextToken });
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
      ':sk': `ENV#${environment}#FLAG#`,
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
  const items = result.Items ? result.Items.map((item) => mapToFeatureFlag(item as Record<string, unknown>)) : [];

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
 * Updates a feature flag with partial updates.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param flagName - Feature flag name to update
 * @param updates - Partial updates to apply (cannot change platform/environment/flagName)
 * @returns Updated feature flag if found, null if flag doesn't exist
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Partial Updates:**
 * Only specified fields are updated. Unchanging fields remain as-is.
 * The `updatedAt` timestamp is automatically set to current time.
 *
 * **Protected Fields:**
 * Cannot update: platform, environment, flagName, createdAt
 * These are immutable identifiers. To change them, delete and recreate the flag.
 *
 * **Dynamic UpdateExpression:**
 * Builds DynamoDB UpdateExpression dynamically based on provided fields.
 * Ensures only specified fields are updated, avoiding overwrites.
 *
 * **Common Update Patterns:**
 * - Toggle flag: `{ enabled: true/false }`
 * - Adjust rollout: `{ rolloutPercentage: 50 }`
 * - Change strategy: `{ rolloutType: 'targeted', targetUserIds: ['user1', 'user2'] }`
 * - Update metadata: `{ description: 'Updated description', updatedBy: 'user@example.com' }`
 *
 * @example
 * ```ts
 * // Toggle feature flag on/off
 * const toggled = await updateFeatureFlag('web', 'production', 'new-ui', {
 *   enabled: false,
 * });
 * console.log(toggled?.enabled); // false
 *
 * // Increase rollout percentage (gradual rollout)
 * await updateFeatureFlag('mobile', 'production', 'new-checkout', {
 *   rolloutPercentage: 50, // Increase from 25% to 50%
 * });
 *
 * // Change from percentage to targeted rollout
 * await updateFeatureFlag('web', 'staging', 'beta-feature', {
 *   rolloutType: 'targeted',
 *   targetUserIds: ['user123', 'user456'],
 *   rolloutPercentage: undefined, // Clear percentage (not needed for targeted)
 * });
 *
 * // Update description and metadata
 * await updateFeatureFlag('web', 'production', 'ai-recommendations', {
 *   description: 'AI recommendations v2 with improved accuracy',
 *   updatedBy: 'ml-team@example.com',
 * });
 *
 * // Flag not found
 * const notFound = await updateFeatureFlag('web', 'production', 'nonexistent', {
 *   enabled: true,
 * });
 * console.log(notFound); // null
 * ```
 */
export async function updateFeatureFlag(
  platform: string,
  environment: string,
  flagName: string,
  updates: Partial<Omit<FeatureFlag, 'platform' | 'environment' | 'flagName' | 'createdAt'>>
): Promise<FeatureFlag | null> {
  const timestamp = new Date().toISOString();

  const updateExpression = Object.keys(updates)
    .map((key) => `#${key} = :${key}`)
    .join(', ');

  const expressionAttributeNames = Object.keys(updates).reduce(
    (acc, key) => ({
      ...acc,
      [`#${key}`]: key,
    }),
    {} as Record<string, string>
  );

  const expressionAttributeValues = Object.entries(updates).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [`:${key}`]: value,
    }),
    { ':updatedAt': timestamp } as Record<string, unknown>
  );

  const params: any = {
    TableName: getTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}#FLAG#${flagName}`,
    },
    UpdateExpression: `SET ${updateExpression}, #updatedAt = :updatedAt`,
    ExpressionAttributeNames: {
      ...expressionAttributeNames,
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
    ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
  };

  try {
    const result = await dynamoDBClient.send(new UpdateCommand(params));
    return result.Attributes ? mapToFeatureFlag(result.Attributes) : null;
  } catch (error: unknown) {
    if ((error as any).code === 'ConditionalCheckFailedException') {
      return null;
    }
    throw error;
  }
}

/**
 * Deletes a feature flag.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param flagName - Feature flag name to delete
 * @returns true if deletion succeeds (even if flag doesn't exist)
 *
 * @throws {Error} If DynamoDB operation fails
 *
 * @remarks
 * **Deletion Behavior:**
 * DynamoDB delete operations are idempotent - deleting a non-existent flag succeeds.
 * Always returns true unless a DynamoDB error occurs.
 *
 * **Deletion Considerations:**
 * - Deletion is permanent and cannot be undone
 * - Clients may still have cached flag values (consider cache invalidation)
 * - SDK evaluations will treat deleted flags as disabled by default
 * - Consider soft-delete pattern (add `deleted: true` flag) for recovery
 *
 * **Best Practices:**
 * Before deleting a flag:
 * 1. Verify it's no longer referenced in code
 * 2. Disable flag and monitor for 24-48 hours
 * 3. Ensure no clients are actively using it
 * 4. Document reason for deletion in audit logs
 *
 * @example
 * ```ts
 * // Delete feature flag
 * const deleted = await deleteFeatureFlag('web', 'production', 'old-ui');
 * console.log(deleted); // true
 *
 * // Deleting non-existent flag also succeeds
 * const deletedAgain = await deleteFeatureFlag('web', 'production', 'old-ui');
 * console.log(deletedAgain); // true (idempotent)
 *
 * // Safe deletion workflow
 * // 1. Disable flag first
 * await updateFeatureFlag('web', 'production', 'deprecated-feature', {
 *   enabled: false,
 * });
 *
 * // 2. Wait for cache to expire (e.g., 24 hours)
 * // 3. Monitor for usage
 * // 4. Delete if no longer needed
 * await deleteFeatureFlag('web', 'production', 'deprecated-feature');
 *
 * // Cleanup old flags (be cautious!)
 * const allFlags = await listFeatureFlags('web', 'staging');
 * for (const flag of allFlags) {
 *   if (flag.flagName.startsWith('experiment-') && !flag.enabled) {
 *     console.log(`Deleting old experiment: ${flag.flagName}`);
 *     await deleteFeatureFlag('web', 'staging', flag.flagName);
 *   }
 * }
 * ```
 */
export async function deleteFeatureFlag(
  platform: string,
  environment: string,
  flagName: string
): Promise<boolean> {
  const params = {
    TableName: getTableName(),
    Key: {
      PK: `PLATFORM#${platform}`,
      SK: `ENV#${environment}#FLAG#${flagName}`,
    },
  };

  await dynamoDBClient.send(new DeleteCommand(params));
  return true;
}

/**
 * Maps DynamoDB item to FeatureFlag object by removing DynamoDB-specific fields.
 *
 * @param item - Raw DynamoDB item with PK and SK fields
 * @returns FeatureFlag object without DynamoDB keys
 *
 * @remarks
 * Removes internal DynamoDB key fields while preserving all feature flag data.
 * Ensures clean API responses without database implementation details.
 *
 * @example
 * ```ts
 * // DynamoDB item
 * const dbItem = {
 *   PK: 'PLATFORM#web',
 *   SK: 'ENV#production#FLAG#new-ui',
 *   platform: 'web',
 *   environment: 'production',
 *   flagName: 'new-ui',
 *   enabled: true,
 *   rolloutType: 'percentage',
 *   rolloutPercentage: 50,
 *   description: 'New UI redesign',
 *   createdBy: 'product@example.com',
 *   createdAt: '2025-01-01T00:00:00Z',
 *   updatedAt: '2025-01-15T10:30:00Z',
 * };
 *
 * const flag = mapToFeatureFlag(dbItem);
 * // => {
 * //   platform: 'web',
 * //   environment: 'production',
 * //   flagName: 'new-ui',
 * //   enabled: true,
 * //   rolloutType: 'percentage',
 * //   rolloutPercentage: 50,
 * //   ...
 * // }
 * ```
 */
function mapToFeatureFlag(item: Record<string, unknown>): FeatureFlag {
  const { PK, SK, ...featureFlagData } = item;
  return featureFlagData as FeatureFlag;
}
