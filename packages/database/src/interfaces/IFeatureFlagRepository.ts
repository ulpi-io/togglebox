/**
 * Repository interface for feature flag operations.
 *
 * @module IFeatureFlagRepository
 *
 * @remarks
 * Defines the contract for feature flag CRUD operations across all database adapters.
 * Supports phased rollouts (simple, percentage, targeted) and toggle operations.
 *
 * **Repository Pattern:**
 * Abstracts database-specific logic behind a common interface.
 * Enables runtime feature toggling without deployments.
 *
 * **Implementations:**
 * - `PrismaFeatureFlagRepository` - MySQL, PostgreSQL, SQLite
 * - `MongooseFeatureFlagRepository` - MongoDB
 * - `DynamoDBFeatureFlagRepository` - DynamoDB
 * - `D1FeatureFlagRepository` - Cloudflare D1
 */

import { FeatureFlag } from '@togglebox/core';
import { OffsetPaginationParams, TokenPaginationParams, PaginatedResult } from './IPagination';

/**
 * Feature flag repository interface for database operations.
 */
export interface IFeatureFlagRepository {
  /**
   * Creates a new feature flag.
   *
   * @param featureFlag - Feature flag data without auto-generated timestamps
   * @returns Created feature flag with generated createdAt and updatedAt
   * @throws {Error} If feature flag with same name already exists in environment
   */
  createFeatureFlag(featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;

  /**
   * Retrieves a feature flag by platform, environment, and flag name.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param flagName - Feature flag name
   * @returns Feature flag if found, null otherwise
   */
  getFeatureFlag(platform: string, environment: string, flagName: string): Promise<FeatureFlag | null>;

  /**
   * Lists feature flags for an environment with optional pagination.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param pagination - Optional pagination parameters (offset-based or token-based)
   * @returns All flags or paginated result
   *
   * @remarks
   * **Default Behavior (No Pagination):**
   * If `pagination` is `undefined`, returns ALL flags for SDK evaluation (performance-critical).
   * - DynamoDB: Automatically paginates internally to fetch all items
   * - SQL/MongoDB: Executes query without LIMIT clause
   *
   * **Explicit Pagination:**
   * If `pagination` is provided, returns paginated results for admin UI.
   *
   * @example
   * ```ts
   * // SDK evaluation: Get all flags (no pagination)
   * const result = await repo.listFeatureFlags('web', 'production');
   * console.log(result.items); // All flags
   *
   * // Admin UI: Get paginated flags
   * const page = await repo.listFeatureFlags('web', 'production', { limit: 20 });
   * console.log(page.items); // Up to 20 flags
   * console.log(page.nextToken); // For DynamoDB
   * ```
   */
  listFeatureFlags(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<PaginatedResult<FeatureFlag>>;

  /**
   * Updates a feature flag with partial updates.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param flagName - Feature flag name to update
   * @param updates - Partial updates (cannot change platform/environment/flagName/createdAt)
   * @returns Updated feature flag if found, null otherwise
   *
   * @remarks
   * Common update patterns:
   * - Toggle: `{ enabled: true/false }`
   * - Rollout: `{ rolloutPercentage: 50 }`
   * - Strategy: `{ rolloutType: 'targeted', targetUserIds: [...] }`
   */
  updateFeatureFlag(
    platform: string,
    environment: string,
    flagName: string,
    updates: Partial<Omit<FeatureFlag, 'platform' | 'environment' | 'flagName' | 'createdAt'>>
  ): Promise<FeatureFlag | null>;

  /**
   * Deletes a feature flag.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param flagName - Feature flag name to delete
   * @returns true if deleted, false if flag doesn't exist
   *
   * @remarks
   * Deletion is permanent. SDKs will treat deleted flags as disabled.
   */
  deleteFeatureFlag(platform: string, environment: string, flagName: string): Promise<boolean>;
}
