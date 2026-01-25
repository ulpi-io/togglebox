/**
 * Repository interface for configuration version operations.
 *
 * @module IConfigRepository
 *
 * @remarks
 * Defines the contract for configuration version CRUD operations across all database adapters.
 * Manages versioned configurations with stable/unstable releases.
 *
 * **Version Identification:**
 * All adapters use `versionLabel` (semantic version string like "1.0.0") as the primary
 * identifier for get, delete, and markStable operations. This ensures consistent API
 * behavior regardless of the underlying database.
 *
 * **Repository Pattern:**
 * Abstracts database-specific logic behind a common interface.
 * Supports immutable versioning and stable version queries.
 *
 * **Implementations:**
 * - `PrismaConfigRepository` - MySQL, PostgreSQL, SQLite (uses versionLabel for lookups)
 * - `MongooseConfigRepository` - MongoDB (uses versionLabel for lookups)
 * - `DynamoDBConfigRepository` - DynamoDB (uses versionLabel as sort key)
 * - `D1ConfigRepository` - Cloudflare D1 (uses versionLabel for lookups)
 */

import { Version } from '@togglebox/configs';
import { OffsetPaginationParams, TokenPaginationParams, PaginatedResult } from './IPagination';

/**
 * Configuration version repository interface for database operations.
 */
export interface IConfigRepository {
  /**
   * Creates a new configuration version.
   *
   * @param version - Version data without auto-generated fields
   * @returns Created version with generated versionTimestamp and createdAt
   * @throws {Error} If version with same timestamp already exists (rare)
   */
  createVersion(version: Omit<Version, 'versionTimestamp' | 'createdAt'>): Promise<Version>;

  /**
   * Retrieves a specific configuration version by label.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param versionLabel - Semantic version label (e.g., "1.0.0")
   * @returns Version if found, null otherwise
   */
  getVersion(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<Version | null>;

  /**
   * Gets the latest stable version for a platform and environment.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Latest stable version if found, null if no stable versions exist
   *
   * @remarks
   * Optimized for performance using sparse indexes (DynamoDB) or database indexes (SQL).
   */
  getLatestStableVersion(platform: string, environment: string): Promise<Version | null>;

  /**
   * Lists all configuration versions for an environment with optional pagination.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param pagination - Optional pagination parameters (offset-based or token-based)
   * @returns List of versions sorted by timestamp (newest first)
   *
   * @remarks
   * **Default Behavior (No Pagination):**
   * If `pagination` is `undefined`, returns ALL versions (no limits).
   * - DynamoDB: Automatically paginates internally to fetch all items
   * - SQL/MongoDB: Executes query without LIMIT clause
   *
   * **Explicit Pagination:**
   * If `pagination` is provided, returns paginated results:
   * - SQL/MongoDB: Pass `OffsetPaginationParams` (offset + limit)
   * - DynamoDB: Pass `TokenPaginationParams` (limit + nextToken)
   *
   * Returns ALL versions (stable and unstable) for version history.
   */
  listVersions(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<PaginatedResult<Version>>;

  /**
   * Deletes a configuration version.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param versionLabel - Semantic version label to delete
   * @returns true if deleted, false if version doesn't exist
   *
   * @remarks
   * Deletion is permanent. Consider soft-delete pattern for recovery.
   */
  deleteVersion(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<boolean>;

  /**
   * Marks a configuration version as stable.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param versionLabel - Semantic version label to mark as stable
   * @returns Updated version if found, null otherwise
   */
  markVersionStable(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<Version | null>;
}
