/**
 * Repository interface for environment operations.
 *
 * @module IEnvironmentRepository
 *
 * @remarks
 * Defines the contract for environment CRUD operations across all database adapters.
 * Environments represent deployment targets within a platform (e.g., production, staging).
 *
 * **Repository Pattern:**
 * Abstracts database-specific logic behind a common interface.
 * All database adapters implement this interface identically.
 *
 * **Implementations:**
 * - `PrismaEnvironmentRepository` - MySQL, PostgreSQL, SQLite
 * - `MongooseEnvironmentRepository` - MongoDB
 * - `DynamoDBEnvironmentRepository` - DynamoDB
 * - `D1EnvironmentRepository` - Cloudflare D1
 */

import { Environment } from "@togglebox/core";
import {
  OffsetPaginationParams,
  TokenPaginationParams,
  PaginatedResult,
} from "./IPagination";

/**
 * Environment repository interface for database operations.
 */
export interface IEnvironmentRepository {
  /**
   * Creates a new environment within a platform.
   *
   * @param environment - Environment data without auto-generated createdAt
   * @returns Created environment with generated timestamp
   * @throws {Error} If environment with same name already exists in platform
   */
  createEnvironment(
    environment: Omit<Environment, "createdAt">,
  ): Promise<Environment>;

  /**
   * Retrieves an environment by platform and environment name.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Environment if found, null otherwise
   */
  getEnvironment(
    platform: string,
    environment: string,
  ): Promise<Environment | null>;

  /**
   * Lists all environments for a platform with optional pagination.
   *
   * @param platform - Platform name to filter by
   * @param pagination - Optional pagination parameters (offset-based or token-based)
   * @returns All environments or paginated list
   *
   * @remarks
   * **Default Behavior (No Pagination):**
   * If `pagination` is `undefined`, returns ALL environments for the platform.
   *
   * **Explicit Pagination:**
   * If `pagination` is provided, returns paginated results.
   *
   * @example
   * ```ts
   * // Fetch ALL environments (no pagination)
   * const all = await repo.listEnvironments('web');
   *
   * // Explicit pagination
   * const page1 = await repo.listEnvironments('web', { limit: 20 });
   * ```
   */
  listEnvironments(
    platform: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<PaginatedResult<Environment>>;

  /**
   * Deletes an environment and all its associated data.
   *
   * @param platform - Platform name
   * @param environment - Environment name to delete
   * @returns True if environment was deleted, false if not found
   *
   * @remarks
   * **WARNING: This is a destructive operation!**
   * Deletes the environment and ALL associated data:
   * - All configuration versions for this environment
   * - All feature flags for this environment
   *
   * Use with caution. Consider soft-delete or archiving for production systems.
   */
  deleteEnvironment(platform: string, environment: string): Promise<boolean>;

  /**
   * Updates an environment's editable fields (description).
   *
   * @param platform - Platform name
   * @param environment - Environment name (slug/identifier)
   * @param updates - Fields to update (only description is editable)
   * @returns Updated environment if found, null otherwise
   *
   * @remarks
   * The environment's slug is the identifier and cannot be changed.
   * Only the description can be updated.
   */
  updateEnvironment?(
    platform: string,
    environment: string,
    updates: { description?: string },
  ): Promise<Environment | null>;
}
