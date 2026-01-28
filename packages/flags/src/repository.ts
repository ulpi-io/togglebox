/**
 * @togglebox/flags - Repository Interface
 *
 * Defines the contract for Flag storage operations.
 * Implementations exist for Prisma, DynamoDB, Mongoose, and D1.
 */

import type { Flag, CreateFlag, UpdateFlag, UpdateRollout } from "./schemas";

/**
 * Pagination result for Flags.
 */
export interface FlagPage {
  items: Flag[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Repository interface for Flag operations.
 *
 * @remarks
 * All implementations must support versioning:
 * - create() creates version 1.0.0
 * - update() creates a new version and deactivates the previous
 * - getActive() returns only the active version
 * - getVersion() returns a specific version
 * - listVersions() returns all versions for a flagKey
 */
export interface IFlagRepository {
  /**
   * Create a new Flag (version 1.0.0).
   * @throws Error if flag with same key already exists
   */
  create(data: CreateFlag): Promise<Flag>;

  /**
   * Update a Flag (creates new version).
   * Deactivates the previous active version.
   * @throws Error if flag doesn't exist
   */
  update(
    platform: string,
    environment: string,
    flagKey: string,
    data: UpdateFlag,
  ): Promise<Flag>;

  /**
   * Toggle a flag's enabled state (in-place update, no new version).
   * @throws Error if flag doesn't exist
   */
  toggle(
    platform: string,
    environment: string,
    flagKey: string,
    enabled: boolean,
  ): Promise<Flag>;

  /**
   * Update rollout settings in-place (no new version created).
   * This allows quick percentage changes without creating a new version.
   * @throws Error if flag doesn't exist
   */
  updateRolloutSettings(
    platform: string,
    environment: string,
    flagKey: string,
    settings: UpdateRollout,
  ): Promise<Flag>;

  /**
   * Get the active version of a Flag.
   * @returns The active flag or null if not found
   */
  getActive(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag | null>;

  /**
   * Get a specific version of a Flag.
   * @returns The flag version or null if not found
   */
  getVersion(
    platform: string,
    environment: string,
    flagKey: string,
    version: string,
  ): Promise<Flag | null>;

  /**
   * List all active Flags for a platform+environment.
   * @returns Paginated list of active flags
   */
  listActive(
    platform: string,
    environment: string,
    limit?: number,
    cursor?: string,
  ): Promise<FlagPage>;

  /**
   * List all versions of a Flag.
   * @returns All versions ordered by version descending
   */
  listVersions(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag[]>;

  /**
   * Delete a Flag and all its versions.
   * @throws Error if flag doesn't exist
   */
  delete(platform: string, environment: string, flagKey: string): Promise<void>;

  /**
   * Check if a Flag exists.
   */
  exists(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<boolean>;
}
