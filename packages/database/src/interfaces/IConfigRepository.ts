/**
 * Repository interface for configuration version operations.
 *
 * @module IConfigRepository
 *
 * @remarks
 * Defines the contract for configuration version CRUD operations across all database adapters.
 * Manages versioned configurations with stable/unstable releases.
 *
 * **Repository Pattern:**
 * Abstracts database-specific logic behind a common interface.
 * Supports immutable versioning and stable version queries.
 *
 * **Implementations:**
 * - `PrismaConfigRepository` - MySQL, PostgreSQL, SQLite
 * - `MongooseConfigRepository` - MongoDB
 * - `DynamoDBConfigRepository` - DynamoDB (sparse index for stable versions)
 * - `D1ConfigRepository` - Cloudflare D1
 */

import { Version } from '@togglebox/core';
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
   * Retrieves a specific configuration version by timestamp.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param versionTimestamp - ISO-8601 timestamp of the version
   * @returns Version if found, null otherwise
   */
  getVersion(
    platform: string,
    environment: string,
    versionTimestamp: string
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
   * @param versionTimestamp - ISO-8601 timestamp of the version to delete
   * @returns true if deleted, false if version doesn't exist
   *
   * @remarks
   * Deletion is permanent. Consider soft-delete pattern for recovery.
   */
  deleteVersion(
    platform: string,
    environment: string,
    versionTimestamp: string
  ): Promise<boolean>;
}
