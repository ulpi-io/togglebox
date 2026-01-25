/**
 * Cloudflare D1 adapter for configuration version operations.
 *
 * @remarks
 * Implements `IConfigRepository` using Cloudflare D1 database.
 * Handles JSON serialization for configuration payloads and versioning logic.
 */

import { Version } from '@togglebox/configs';
import { IConfigRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';

/**
 * D1 implementation of configuration repository.
 *
 * @remarks
 * **JSON Handling:** Config stored as JSON string, parsed/stringified automatically.
 * **Versioning:** Auto-generated ISO-8601 timestamps ensure chronological ordering.
 * **Stable Versions:** WHERE clause filtering for fast latest-stable queries.
 * **SQLite Booleans:** Uses 0/1 for boolean fields (SQLite has no native boolean type).
 */
export class D1ConfigRepository implements IConfigRepository {
  constructor(private db: D1Database) {}

  /**
   * Creates a new configuration version.
   *
   * @param version - Version data (versionTimestamp and createdAt are auto-generated)
   * @returns Created version with generated timestamp
   *
   * @throws {Error} If platform not found
   */
  async createVersion(version: Omit<Version, 'versionTimestamp' | 'createdAt'>): Promise<Version> {
    const versionTimestamp = new Date().toISOString();
    const createdAt = versionTimestamp;

    // Get platformId from platform name
    const platform = await this.db
      .prepare('SELECT id FROM platforms WHERE name = ?1')
      .bind(version.platform)
      .first<{ id: string }>();

    if (!platform) {
      throw new Error(`Platform ${version.platform} not found`);
    }

    // Serialize config object to JSON string
    const configJson = JSON.stringify(version.config);

    await this.db
      .prepare(
        `INSERT INTO config_versions
        (platform, environment, versionTimestamp, platformId, versionLabel, isStable, config, createdBy, createdAt)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      )
      .bind(
        version.platform,
        version.environment,
        versionTimestamp,
        platform.id,
        version.versionLabel || null,
        version.isStable ? 1 : 0, // SQLite boolean
        configJson,
        version.createdBy,
        createdAt
      )
      .run();

    return {
      platform: version.platform,
      environment: version.environment,
      versionLabel: version.versionLabel,
      versionTimestamp,
      isStable: version.isStable,
      config: version.config,
      createdBy: version.createdBy,
      createdAt,
    };
  }

  /**
   * Gets configuration version by versionLabel.
   *
   * @remarks
   * Uses versionLabel as the human-readable identifier for consistency
   * across all database adapters (DynamoDB, Prisma, D1).
   * JSON config is parsed back to object automatically.
   */
  async getVersion(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<Version | null> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, versionTimestamp, versionLabel, isStable, config, createdBy, createdAt
        FROM config_versions
        WHERE platform = ?1 AND environment = ?2 AND versionLabel = ?3`
      )
      .bind(platform, environment, versionLabel)
      .first<{
        platform: string;
        environment: string;
        versionTimestamp: string;
        versionLabel: string | null;
        isStable: number;
        config: string;
        createdBy: string;
        createdAt: string;
      }>();

    if (!result) {
      return null;
    }

    return {
      platform: result.platform,
      environment: result.environment,
      versionLabel: result.versionLabel ?? '',
      versionTimestamp: result.versionTimestamp,
      isStable: Boolean(result.isStable),
      config: JSON.parse(result.config),
      createdBy: result.createdBy,
      createdAt: result.createdAt,
    };
  }

  /**
   * Gets latest stable version for platform and environment.
   *
   * @remarks
   * **Query:** WHERE isStable=1, ORDER BY versionTimestamp DESC, LIMIT 1.
   * **SQLite Boolean:** Uses 1 for true (SQLite integer comparison).
   */
  async getLatestStableVersion(platform: string, environment: string): Promise<Version | null> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, versionTimestamp, versionLabel, isStable, config, createdBy, createdAt
        FROM config_versions
        WHERE platform = ?1 AND environment = ?2 AND isStable = 1
        ORDER BY versionTimestamp DESC
        LIMIT 1`
      )
      .bind(platform, environment)
      .first<{
        platform: string;
        environment: string;
        versionTimestamp: string;
        versionLabel: string | null;
        isStable: number;
        config: string;
        createdBy: string;
        createdAt: string;
      }>();

    if (!result) {
      return null;
    }

    return {
      platform: result.platform,
      environment: result.environment,
      versionLabel: result.versionLabel ?? '',
      versionTimestamp: result.versionTimestamp,
      isStable: Boolean(result.isStable),
      config: JSON.parse(result.config),
      createdBy: result.createdBy,
      createdAt: result.createdAt,
    };
  }

  /**
   * Lists all versions for environment with optional pagination.
   *
   * @remarks
   * **Includes:** ALL versions (stable and unstable) for version history.
   * **Sorting:** By versionTimestamp descending (newest first).
   * **Pagination:** Optional - fetches ALL items if not provided, single page if provided.
   */
  async listVersions(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<Version>> {
    // Get total count for metadata
    const countResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM config_versions WHERE platform = ?1 AND environment = ?2')
      .bind(platform, environment)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const result = await this.db
        .prepare(
          `SELECT platform, environment, versionTimestamp, versionLabel, isStable, config, createdBy, createdAt
          FROM config_versions
          WHERE platform = ?1 AND environment = ?2
          ORDER BY versionTimestamp DESC`
        )
        .bind(platform, environment)
        .all<{
          platform: string;
          environment: string;
          versionTimestamp: string;
          versionLabel: string | null;
          isStable: number;
          config: string;
          createdBy: string;
          createdAt: string;
        }>();

      const items = result.results
        ? result.results.map((v) => ({
            platform: v.platform,
            environment: v.environment,
            versionLabel: v.versionLabel ?? '',
            versionTimestamp: v.versionTimestamp,
            isStable: Boolean(v.isStable),
            config: JSON.parse(v.config),
            createdBy: v.createdBy,
            createdAt: v.createdAt,
          }))
        : [];

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const result = await this.db
      .prepare(
        `SELECT platform, environment, versionTimestamp, versionLabel, isStable, config, createdBy, createdAt
        FROM config_versions
        WHERE platform = ?1 AND environment = ?2
        ORDER BY versionTimestamp DESC
        LIMIT ?3 OFFSET ?4`
      )
      .bind(platform, environment, params.limit, params.offset)
      .all<{
        platform: string;
        environment: string;
        versionTimestamp: string;
        versionLabel: string | null;
        isStable: number;
        config: string;
        createdBy: string;
        createdAt: string;
      }>();

    const items = result.results
      ? result.results.map((v) => ({
          platform: v.platform,
          environment: v.environment,
          versionLabel: v.versionLabel ?? '',
          versionTimestamp: v.versionTimestamp,
          isStable: Boolean(v.isStable),
          config: JSON.parse(v.config),
          createdBy: v.createdBy,
          createdAt: v.createdAt,
        }))
      : [];

    return { items, total };
  }

  /**
   * Deletes a configuration version by versionLabel.
   *
   * @remarks
   * Uses versionLabel as the human-readable identifier for consistency
   * across all database adapters (DynamoDB, Prisma, D1).
   * Uses D1's meta.rows_written to detect if row was deleted.
   *
   * @returns true if deleted, false if version doesn't exist
   */
  async deleteVersion(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        'DELETE FROM config_versions WHERE platform = ?1 AND environment = ?2 AND versionLabel = ?3'
      )
      .bind(platform, environment, versionLabel)
      .run();

    return result.meta.rows_written > 0;
  }

  /**
   * Marks a configuration version as stable.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param versionLabel - Version label to mark as stable
   * @returns Updated version if found, null otherwise
   */
  async markVersionStable(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<Version | null> {
    // First find the version by versionLabel
    const result = await this.db
      .prepare(
        `SELECT platform, environment, versionTimestamp, versionLabel, isStable, config, createdBy, createdAt
        FROM config_versions
        WHERE platform = ?1 AND environment = ?2 AND versionLabel = ?3`
      )
      .bind(platform, environment, versionLabel)
      .first<{
        platform: string;
        environment: string;
        versionTimestamp: string;
        versionLabel: string | null;
        isStable: number;
        config: string;
        createdBy: string;
        createdAt: string;
      }>();

    if (!result) {
      return null;
    }

    // Update the version to be stable
    await this.db
      .prepare(
        `UPDATE config_versions SET isStable = 1
         WHERE platform = ?1 AND environment = ?2 AND versionTimestamp = ?3`
      )
      .bind(platform, environment, result.versionTimestamp)
      .run();

    return {
      platform: result.platform,
      environment: result.environment,
      versionLabel: result.versionLabel ?? '',
      versionTimestamp: result.versionTimestamp,
      isStable: true,
      config: JSON.parse(result.config),
      createdBy: result.createdBy,
      createdAt: result.createdAt,
    };
  }
}
