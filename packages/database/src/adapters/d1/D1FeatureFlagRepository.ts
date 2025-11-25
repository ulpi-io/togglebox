/**
 * Cloudflare D1 adapter for feature flag operations.
 *
 * @remarks
 * Implements `IFeatureFlagRepository` using Cloudflare D1 database.
 * Handles JSON array serialization for targeting fields and phased rollout logic.
 */

import { FeatureFlag } from '@togglebox/core';
import { IFeatureFlagRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';

/**
 * D1 implementation of feature flag repository.
 *
 * @remarks
 * **JSON Array Handling:** Targeting arrays stored as JSON strings, parsed/stringified automatically.
 * **Dual-Mode Pagination:** Returns array if no pagination, returns paginated result if pagination provided.
 * **Phased Rollouts:** Supports simple, percentage, and targeted rollout strategies.
 * **SQLite Booleans:** Uses 0/1 for boolean fields (enabled, isStable).
 * **Dynamic Updates:** Builds UPDATE statement dynamically based on provided fields.
 */
export class D1FeatureFlagRepository implements IFeatureFlagRepository {
  constructor(private db: D1Database) {}

  /**
   * Creates a new feature flag with JSON array serialization.
   *
   * @throws {Error} If platform not found
   * @throws {Error} If feature flag already exists (SQLite UNIQUE constraint)
   *
   * @remarks
   * Serializes targeting arrays (targetUserIds, excludeUserIds, etc.) to JSON strings.
   */
  async createFeatureFlag(
    featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    const createdAt = new Date().toISOString();

    // Get platformId from platform name
    const platform = await this.db
      .prepare('SELECT id FROM platforms WHERE name = ?1')
      .bind(featureFlag.platform)
      .first<{ id: string }>();

    if (!platform) {
      throw new Error(`Platform ${featureFlag.platform} not found`);
    }

    // Serialize arrays to JSON strings
    const targetUserIds = JSON.stringify(featureFlag.targetUserIds || []);
    const excludeUserIds = JSON.stringify(featureFlag.excludeUserIds || []);
    const targetCountries = JSON.stringify(featureFlag.targetCountries || []);
    const targetLanguages = JSON.stringify(featureFlag.targetLanguages || []);

    try {
      await this.db
        .prepare(
          `INSERT INTO feature_flags
          (platform, environment, flagName, platformId, enabled, description, createdBy, createdAt,
           rolloutType, rolloutPercentage, targetUserIds, excludeUserIds, targetCountries, targetLanguages)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
        )
        .bind(
          featureFlag.platform,
          featureFlag.environment,
          featureFlag.flagName,
          platform.id,
          featureFlag.enabled ? 1 : 0,
          featureFlag.description || null,
          featureFlag.createdBy,
          createdAt,
          featureFlag.rolloutType || 'simple',
          featureFlag.rolloutPercentage || null,
          targetUserIds,
          excludeUserIds,
          targetCountries,
          targetLanguages
        )
        .run();

      return {
        ...featureFlag,
        createdAt,
        updatedAt: undefined,
      };
    } catch (error: unknown) {
      if ((error as Error).message?.includes('UNIQUE constraint failed')) {
        throw new Error(
          `Feature flag ${featureFlag.flagName} already exists for ${featureFlag.platform}/${featureFlag.environment}`
        );
      }
      throw error;
    }
  }

  /**
   * Gets feature flag by composite key.
   *
   * @remarks
   * JSON arrays are parsed automatically. SQLite integers (0/1) converted to booleans.
   */
  async getFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<FeatureFlag | null> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagName, enabled, description, createdBy, createdAt, updatedAt,
                rolloutType, rolloutPercentage, targetUserIds, excludeUserIds, targetCountries, targetLanguages
         FROM feature_flags
         WHERE platform = ?1 AND environment = ?2 AND flagName = ?3`
      )
      .bind(platform, environment, flagName)
      .first<{
        platform: string;
        environment: string;
        flagName: string;
        enabled: number;
        description: string | null;
        createdBy: string;
        createdAt: string;
        updatedAt: string | null;
        rolloutType: string;
        rolloutPercentage: number | null;
        targetUserIds: string;
        excludeUserIds: string;
        targetCountries: string;
        targetLanguages: string;
      }>();

    if (!result) {
      return null;
    }

    return {
      platform: result.platform,
      environment: result.environment,
      flagName: result.flagName,
      enabled: Boolean(result.enabled),
      description: result.description || undefined,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt || undefined,
      rolloutType: result.rolloutType as 'simple' | 'percentage' | 'targeted',
      rolloutPercentage: result.rolloutPercentage || undefined,
      targetUserIds: JSON.parse(result.targetUserIds),
      excludeUserIds: JSON.parse(result.excludeUserIds),
      targetCountries: JSON.parse(result.targetCountries),
      targetLanguages: JSON.parse(result.targetLanguages),
    };
  }

  /**
   * Lists feature flags for platform and environment with optional pagination.
   *
   * @param pagination - Optional pagination parameters (offset-based)
   * @returns Paginated result with all items if no pagination, single page if pagination provided
   *
   * @remarks
   * **Dual-Mode Behavior:**
   * - **Without pagination**: Returns ALL flags in single query (for SDK evaluation)
   * - **With pagination**: Returns offset-based paginated result (for admin UI)
   */
  async listFeatureFlags(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<FeatureFlag>> {
    // Get total count for metadata
    const countResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM feature_flags WHERE platform = ?1 AND environment = ?2')
      .bind(platform, environment)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const result = await this.db
        .prepare(
          `SELECT platform, environment, flagName, enabled, description, createdBy, createdAt, updatedAt,
                  rolloutType, rolloutPercentage, targetUserIds, excludeUserIds, targetCountries, targetLanguages
           FROM feature_flags
           WHERE platform = ?1 AND environment = ?2
           ORDER BY createdAt DESC`
        )
        .bind(platform, environment)
        .all<{
          platform: string;
          environment: string;
          flagName: string;
          enabled: number;
          description: string | null;
          createdBy: string;
          createdAt: string;
          updatedAt: string | null;
          rolloutType: string;
          rolloutPercentage: number | null;
          targetUserIds: string;
          excludeUserIds: string;
          targetCountries: string;
          targetLanguages: string;
        }>();

      const items = result.results
        ? result.results.map((f) => ({
            platform: f.platform,
            environment: f.environment,
            flagName: f.flagName,
            enabled: Boolean(f.enabled),
            description: f.description || undefined,
            createdBy: f.createdBy,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt || undefined,
            rolloutType: f.rolloutType as 'simple' | 'percentage' | 'targeted',
            rolloutPercentage: f.rolloutPercentage || undefined,
            targetUserIds: JSON.parse(f.targetUserIds),
            excludeUserIds: JSON.parse(f.excludeUserIds),
            targetCountries: JSON.parse(f.targetCountries),
            targetLanguages: JSON.parse(f.targetLanguages),
          }))
        : [];

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagName, enabled, description, createdBy, createdAt, updatedAt,
                rolloutType, rolloutPercentage, targetUserIds, excludeUserIds, targetCountries, targetLanguages
         FROM feature_flags
         WHERE platform = ?1 AND environment = ?2
         ORDER BY createdAt DESC
         LIMIT ?3 OFFSET ?4`
      )
      .bind(platform, environment, params.limit, params.offset)
      .all<{
        platform: string;
        environment: string;
        flagName: string;
        enabled: number;
        description: string | null;
        createdBy: string;
        createdAt: string;
        updatedAt: string | null;
        rolloutType: string;
        rolloutPercentage: number | null;
        targetUserIds: string;
        excludeUserIds: string;
        targetCountries: string;
        targetLanguages: string;
      }>();

    const items = result.results
      ? result.results.map((f) => ({
          platform: f.platform,
          environment: f.environment,
          flagName: f.flagName,
          enabled: Boolean(f.enabled),
          description: f.description || undefined,
          createdBy: f.createdBy,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt || undefined,
          rolloutType: f.rolloutType as 'simple' | 'percentage' | 'targeted',
          rolloutPercentage: f.rolloutPercentage || undefined,
          targetUserIds: JSON.parse(f.targetUserIds),
          excludeUserIds: JSON.parse(f.excludeUserIds),
          targetCountries: JSON.parse(f.targetCountries),
          targetLanguages: JSON.parse(f.targetLanguages),
        }))
      : [];

    return { items, total };
  }

  /**
   * Updates feature flag with partial changes using dynamic SQL.
   *
   * @param updates - Partial feature flag updates
   * @returns Updated feature flag, or null if not found
   *
   * @remarks
   * **Dynamic SQL:** Builds UPDATE statement based on provided fields only.
   * **Array Serialization:** Targeting arrays JSON-stringified automatically.
   * **Always Updates:** updatedAt timestamp is always set.
   */
  async updateFeatureFlag(
    platform: string,
    environment: string,
    flagName: string,
    updates: Partial<Omit<FeatureFlag, 'platform' | 'environment' | 'flagName' | 'createdAt'>>
  ): Promise<FeatureFlag | null> {
    const updatedAt = new Date().toISOString();

    // Build dynamic SQL update statement
    const updateFields: string[] = [];
    const values: unknown[] = [];

    if (updates.enabled !== undefined) {
      updateFields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.rolloutType !== undefined) {
      updateFields.push('rolloutType = ?');
      values.push(updates.rolloutType);
    }
    if (updates.rolloutPercentage !== undefined) {
      updateFields.push('rolloutPercentage = ?');
      values.push(updates.rolloutPercentage || null);
    }
    if (updates.targetUserIds !== undefined) {
      updateFields.push('targetUserIds = ?');
      values.push(JSON.stringify(updates.targetUserIds));
    }
    if (updates.excludeUserIds !== undefined) {
      updateFields.push('excludeUserIds = ?');
      values.push(JSON.stringify(updates.excludeUserIds));
    }
    if (updates.targetCountries !== undefined) {
      updateFields.push('targetCountries = ?');
      values.push(JSON.stringify(updates.targetCountries));
    }
    if (updates.targetLanguages !== undefined) {
      updateFields.push('targetLanguages = ?');
      values.push(JSON.stringify(updates.targetLanguages));
    }

    // Always update updatedAt
    updateFields.push('updatedAt = ?');
    values.push(updatedAt);

    if (updateFields.length === 1) {
      // Only updatedAt was added, nothing to update
      return this.getFeatureFlag(platform, environment, flagName);
    }

    // Add WHERE clause values
    values.push(platform, environment, flagName);

    const sql = `UPDATE feature_flags SET ${updateFields.join(', ')} WHERE platform = ? AND environment = ? AND flagName = ?`;

    await this.db.prepare(sql).bind(...values).run();

    return this.getFeatureFlag(platform, environment, flagName);
  }

  /**
   * Deletes a feature flag.
   *
   * @returns true if deleted, false if flag doesn't exist
   *
   * @remarks
   * Uses D1's meta.rows_written to detect if row was deleted.
   */
  async deleteFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        'DELETE FROM feature_flags WHERE platform = ?1 AND environment = ?2 AND flagName = ?3'
      )
      .bind(platform, environment, flagName)
      .run();

    return result.meta.rows_written > 0;
  }
}
