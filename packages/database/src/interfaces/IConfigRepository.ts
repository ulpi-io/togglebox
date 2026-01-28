/**
 * Repository interface for config parameter operations.
 *
 * @module IConfigRepository
 *
 * @remarks
 * Parameters are versioned. Each edit creates a new version.
 * Only one version is active per parameterKey.
 */

import {
  ConfigParameter,
  CreateConfigParameter,
  UpdateConfigParameter,
} from "@togglebox/configs";
import {
  OffsetPaginationParams,
  TokenPaginationParams,
  PaginatedResult,
} from "./IPagination";

export interface IConfigRepository {
  // ============================================================================
  // PUBLIC (SDK)
  // ============================================================================

  /**
   * Gets all active parameters as key-value object.
   * This is what SDKs call.
   */
  getConfigs(
    platform: string,
    environment: string,
  ): Promise<Record<string, unknown>>;

  // ============================================================================
  // ADMIN CRUD
  // ============================================================================

  /**
   * Creates a new parameter (version 1).
   */
  create(param: CreateConfigParameter): Promise<ConfigParameter>;

  /**
   * Updates a parameter (creates new version, marks it active).
   */
  update(
    platform: string,
    environment: string,
    parameterKey: string,
    updates: UpdateConfigParameter,
  ): Promise<ConfigParameter>;

  /**
   * Deletes a parameter (all versions).
   */
  delete(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<boolean>;

  /**
   * Gets the active version of a parameter.
   */
  getActive(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter | null>;

  /**
   * Lists all active parameters with metadata.
   */
  listActive(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<PaginatedResult<ConfigParameter>>;

  /**
   * Lists all versions of a parameter.
   */
  listVersions(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter[]>;

  /**
   * Rolls back to a previous version (marks it active).
   */
  rollback(
    platform: string,
    environment: string,
    parameterKey: string,
    version: string,
  ): Promise<ConfigParameter | null>;

  /**
   * Counts active parameters in an environment.
   */
  count(platform: string, environment: string): Promise<number>;
}
