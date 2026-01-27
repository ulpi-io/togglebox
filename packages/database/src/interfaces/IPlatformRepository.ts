/**
 * Repository interface for platform operations.
 *
 * @module IPlatformRepository
 *
 * @remarks
 * Defines the contract for platform CRUD operations across all database adapters.
 * Implemented by Prisma, Mongoose, DynamoDB, and D1 adapters.
 *
 * **Repository Pattern:**
 * Abstracts database-specific logic behind a common interface.
 * Enables swapping databases without changing application code.
 *
 * **Implementations:**
 * - `PrismaPlatformRepository` - MySQL, PostgreSQL, SQLite
 * - `MongoosePlatformRepository` - MongoDB
 * - `DynamoDBPlatformRepository` - DynamoDB
 * - `D1PlatformRepository` - Cloudflare D1
 */

import { Platform } from '@togglebox/core';
import { OffsetPaginationParams, TokenPaginationParams, PaginatedResult } from './IPagination';

/**
 * Platform repository interface for database operations.
 */
export interface IPlatformRepository {
  /**
   * Creates a new platform.
   *
   * @param platform - Platform data without auto-generated ID
   * @returns Created platform with generated ID
   * @throws {Error} If platform with same name already exists
   */
  createPlatform(platform: Omit<Platform, 'id'>): Promise<Platform>;

  /**
   * Retrieves a platform by name.
   *
   * @param name - Platform name (unique identifier)
   * @returns Platform if found, null otherwise
   */
  getPlatform(name: string): Promise<Platform | null>;

  /**
   * Lists all platforms with optional pagination.
   *
   * @param pagination - Optional pagination parameters (offset-based or token-based)
   * @returns All platforms or paginated list
   *
   * @remarks
   * **Default Behavior (No Pagination):**
   * If `pagination` is `undefined`, returns ALL platforms.
   * - DynamoDB: Automatically paginates internally to fetch all items
   * - SQL/MongoDB: Executes query without LIMIT clause
   *
   * **Explicit Pagination:**
   * If `pagination` is provided, returns paginated results:
   * - SQL/MongoDB: Pass `OffsetPaginationParams` (offset + limit)
   * - DynamoDB: Pass `TokenPaginationParams` (limit + nextToken)
   *
   * @example
   * ```ts
   * // Fetch ALL platforms (no pagination)
   * const all = await repo.listPlatforms();
   * console.log(all.items.length); // Could be 1000+
   *
   * // Explicit pagination
   * const page1 = await repo.listPlatforms({ limit: 20 });
   * console.log(page1.items.length); // Up to 20
   * console.log(page1.nextToken); // For DynamoDB
   * console.log(page1.total); // For SQL/MongoDB
   * ```
   */
  listPlatforms(
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<PaginatedResult<Platform>>;

  /**
   * Deletes a platform and all its associated data.
   *
   * @param name - Platform name to delete
   * @returns True if platform was deleted, false if not found
   *
   * @remarks
   * **WARNING: This is a destructive operation!**
   * Deletes the platform and ALL associated data:
   * - All environments for this platform
   * - All configuration versions
   * - All feature flags
   *
   * Use with caution. Consider soft-delete or archiving for production systems.
   */
  deletePlatform(name: string): Promise<boolean>;

  /**
   * Updates a platform's editable fields (name, description).
   *
   * @param currentName - Current platform name (slug/identifier)
   * @param updates - Fields to update (only name and description are editable)
   * @returns Updated platform if found, null otherwise
   *
   * @remarks
   * The platform's slug (currentName) is the identifier and cannot be changed.
   * Only the display name and description can be updated.
   */
  updatePlatform?(
    currentName: string,
    updates: { name?: string; description?: string }
  ): Promise<Platform | null>;
}
