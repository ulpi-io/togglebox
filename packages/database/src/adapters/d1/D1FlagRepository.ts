/**
 * Cloudflare D1 adapter for Feature Flag operations.
 *
 * @remarks
 * Implements `IFlagRepository` from @togglebox/flags package using D1 SQLite.
 * This is the 2-value model with exactly 2 values (A/B) and country/language targeting.
 */

import type {
  Flag,
  CreateFlag,
  UpdateFlag,
  UpdateRollout,
} from '@togglebox/flags';
import type { IFlagRepository, FlagPage } from '@togglebox/flags';

/**
 * D1 row type for Flag queries.
 */
type D1FlagRow = {
  platform: string;
  environment: string;
  flagKey: string;
  name: string;
  description: string | null;
  enabled: number;
  flagType: string;
  valueA: string;
  valueB: string;
  targeting: string;
  defaultValue: string;
  rolloutEnabled: number | null;
  rolloutPercentageA: number | null;
  rolloutPercentageB: number | null;
  version: string;
  isActive: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * D1 implementation of Feature Flag repository.
 *
 * @remarks
 * **Table Schema:**
 * - platform: VARCHAR (indexed)
 * - environment: VARCHAR (indexed)
 * - flagKey: VARCHAR (indexed)
 * - version: VARCHAR
 * - isActive: INTEGER (0/1, SQLite boolean)
 * - targeting: TEXT (JSON string)
 *
 * **Versioning Strategy:**
 * - New flags start at 1.0.0
 * - Updates increment patch version (1.0.0 → 1.0.1)
 * - Only one active version per flag (isActive=1)
 * - Old versions kept for history (isActive=0)
 *
 * **Pagination:**
 * - Uses offset-based pagination (LIMIT/OFFSET)
 * - nextCursor is stringified offset value
 */
export class D1FlagRepository implements IFlagRepository {
  constructor(private db: D1Database) {}

  /**
   * Creates a new Feature Flag (version 1.0.0).
   */
  async create(data: CreateFlag): Promise<Flag> {
    const now = new Date().toISOString();
    const version = '1.0.0';

    const flag: Flag = {
      platform: data.platform,
      environment: data.environment,
      flagKey: data.flagKey,
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? false,
      flagType: data.flagType ?? 'boolean',
      valueA: data.valueA ?? true,
      valueB: data.valueB ?? false,
      targeting: data.targeting ?? {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      defaultValue: data.defaultValue ?? 'B',
      // Percentage rollout (disabled by default)
      rolloutEnabled: data.rolloutEnabled ?? false,
      rolloutPercentageA: data.rolloutPercentageA ?? 100,
      rolloutPercentageB: data.rolloutPercentageB ?? 0,
      version,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // Serialize JSON fields to strings
    const targetingJson = JSON.stringify(flag.targeting);
    const valueAJson = JSON.stringify(flag.valueA);
    const valueBJson = JSON.stringify(flag.valueB);

    await this.db
      .prepare(
        `INSERT INTO flags
        (platform, environment, flagKey, name, description, enabled, flagType, valueA, valueB, targeting, defaultValue, rolloutEnabled, rolloutPercentageA, rolloutPercentageB, version, isActive, createdBy, createdAt, updatedAt)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`
      )
      .bind(
        flag.platform,
        flag.environment,
        flag.flagKey,
        flag.name,
        flag.description || null,
        flag.enabled ? 1 : 0,
        flag.flagType,
        valueAJson,
        valueBJson,
        targetingJson,
        flag.defaultValue,
        flag.rolloutEnabled ? 1 : 0,
        flag.rolloutPercentageA,
        flag.rolloutPercentageB,
        flag.version,
        flag.isActive ? 1 : 0,
        flag.createdBy,
        flag.createdAt,
        flag.updatedAt
      )
      .run();

    return flag;
  }

  /**
   * Updates a Feature Flag by creating a new version.
   */
  async update(
    platform: string,
    environment: string,
    flagKey: string,
    data: UpdateFlag
  ): Promise<Flag> {
    // Get current active version
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    // Parse current version and increment patch
    const [major, minor, patch] = current.version.split('.').map(Number);
    const newVersion = `${major}.${minor}.${(patch ?? 0) + 1}`;
    const now = new Date().toISOString();

    // Create new version
    const newFlag: Flag = {
      ...current,
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      enabled: data.enabled ?? current.enabled,
      valueA: data.valueA ?? current.valueA,
      valueB: data.valueB ?? current.valueB,
      targeting: data.targeting ?? current.targeting,
      defaultValue: data.defaultValue ?? current.defaultValue,
      // Percentage rollout
      rolloutEnabled: data.rolloutEnabled ?? current.rolloutEnabled,
      rolloutPercentageA: data.rolloutPercentageA ?? current.rolloutPercentageA,
      rolloutPercentageB: data.rolloutPercentageB ?? current.rolloutPercentageB,
      version: newVersion,
      isActive: true,
      createdBy: data.createdBy,
      updatedAt: now,
    };

    // Deactivate old version
    await this.db
      .prepare(
        `UPDATE flags SET isActive = 0
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3 AND version = ?4`
      )
      .bind(platform, environment, flagKey, current.version)
      .run();

    // Insert new version
    const targetingJson = JSON.stringify(newFlag.targeting);
    const valueAJson = JSON.stringify(newFlag.valueA);
    const valueBJson = JSON.stringify(newFlag.valueB);

    await this.db
      .prepare(
        `INSERT INTO flags
        (platform, environment, flagKey, name, description, enabled, flagType, valueA, valueB, targeting, defaultValue, rolloutEnabled, rolloutPercentageA, rolloutPercentageB, version, isActive, createdBy, createdAt, updatedAt)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`
      )
      .bind(
        newFlag.platform,
        newFlag.environment,
        newFlag.flagKey,
        newFlag.name,
        newFlag.description || null,
        newFlag.enabled ? 1 : 0,
        newFlag.flagType,
        valueAJson,
        valueBJson,
        targetingJson,
        newFlag.defaultValue,
        newFlag.rolloutEnabled ? 1 : 0,
        newFlag.rolloutPercentageA,
        newFlag.rolloutPercentageB,
        newFlag.version,
        newFlag.isActive ? 1 : 0,
        newFlag.createdBy,
        newFlag.createdAt,
        newFlag.updatedAt
      )
      .run();

    return newFlag;
  }

  /**
   * Toggle a flag's enabled state (in-place update, no new version).
   */
  async toggle(
    platform: string,
    environment: string,
    flagKey: string,
    enabled: boolean
  ): Promise<Flag> {
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE flags SET enabled = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND flagKey = ?5 AND version = ?6`
      )
      .bind(enabled ? 1 : 0, now, platform, environment, flagKey, current.version)
      .run();

    return {
      ...current,
      enabled,
      updatedAt: now,
    };
  }

  /**
   * Get the active version of a Feature Flag.
   */
  async getActive(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<Flag | null> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagKey, name, description, enabled, flagType, valueA, valueB, targeting, defaultValue, rolloutEnabled, rolloutPercentageA, rolloutPercentageB, version, isActive, createdBy, createdAt, updatedAt
        FROM flags
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3 AND isActive = 1
        LIMIT 1`
      )
      .bind(platform, environment, flagKey)
      .first<D1FlagRow>();

    if (!result) {
      return null;
    }

    return this.rowToFlag(result);
  }

  /**
   * Get a specific version of a Feature Flag.
   */
  async getVersion(
    platform: string,
    environment: string,
    flagKey: string,
    version: string
  ): Promise<Flag | null> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagKey, name, description, enabled, flagType, valueA, valueB, targeting, defaultValue, rolloutEnabled, rolloutPercentageA, rolloutPercentageB, version, isActive, createdBy, createdAt, updatedAt
        FROM flags
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3 AND version = ?4`
      )
      .bind(platform, environment, flagKey, version)
      .first<D1FlagRow>();

    if (!result) {
      return null;
    }

    return this.rowToFlag(result);
  }

  /**
   * List all active Feature Flags for a platform+environment.
   */
  async listActive(
    platform: string,
    environment: string,
    limit: number = 100,
    cursor?: string
  ): Promise<FlagPage> {
    const offset = cursor ? parseInt(cursor, 10) : 0;

    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagKey, name, description, enabled, flagType, valueA, valueB, targeting, defaultValue, rolloutEnabled, rolloutPercentageA, rolloutPercentageB, version, isActive, createdBy, createdAt, updatedAt
        FROM flags
        WHERE platform = ?1 AND environment = ?2 AND isActive = 1
        ORDER BY createdAt DESC
        LIMIT ?3 OFFSET ?4`
      )
      .bind(platform, environment, limit, offset)
      .all<D1FlagRow>();

    const items = result.results ? result.results.map(row => this.rowToFlag(row)) : [];
    const hasMore = items.length === limit;
    const nextCursor = hasMore ? String(offset + limit) : undefined;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * List all versions of a Feature Flag.
   */
  async listVersions(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<Flag[]> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagKey, name, description, enabled, flagType, valueA, valueB, targeting, defaultValue, rolloutEnabled, rolloutPercentageA, rolloutPercentageB, version, isActive, createdBy, createdAt, updatedAt
        FROM flags
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3
        ORDER BY version DESC`
      )
      .bind(platform, environment, flagKey)
      .all<D1FlagRow>();

    return result.results ? result.results.map(row => this.rowToFlag(row)) : [];
  }

  /**
   * Delete a Feature Flag and all its versions.
   */
  async delete(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<void> {
    const result = await this.db
      .prepare(
        'DELETE FROM flags WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3'
      )
      .bind(platform, environment, flagKey)
      .run();

    if (result.meta.rows_written === 0) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }
  }

  /**
   * Check if a Feature Flag exists.
   */
  async exists(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<boolean> {
    const flag = await this.getActive(platform, environment, flagKey);
    return flag !== null;
  }

  /**
   * Update rollout settings in-place (no new version created).
   * This allows quick percentage changes without creating a new version.
   */
  async updateRolloutSettings(
    platform: string,
    environment: string,
    flagKey: string,
    settings: UpdateRollout
  ): Promise<Flag> {
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE flags SET
          rolloutEnabled = ?1,
          rolloutPercentageA = ?2,
          rolloutPercentageB = ?3,
          updatedAt = ?4
        WHERE platform = ?5 AND environment = ?6 AND flagKey = ?7 AND version = ?8`
      )
      .bind(
        (settings.rolloutEnabled ?? current.rolloutEnabled) ? 1 : 0,
        settings.rolloutPercentageA ?? current.rolloutPercentageA,
        settings.rolloutPercentageB ?? current.rolloutPercentageB,
        now,
        platform,
        environment,
        flagKey,
        current.version
      )
      .run();

    return {
      ...current,
      rolloutEnabled: settings.rolloutEnabled ?? current.rolloutEnabled,
      rolloutPercentageA: settings.rolloutPercentageA ?? current.rolloutPercentageA,
      rolloutPercentageB: settings.rolloutPercentageB ?? current.rolloutPercentageB,
      updatedAt: now,
    };
  }

  /**
   * Convert D1 row to Flag type.
   * Includes defaults for rollout fields for backward compatibility.
   */
  private rowToFlag(row: D1FlagRow): Flag {
    return {
      platform: row.platform,
      environment: row.environment,
      flagKey: row.flagKey,
      name: row.name,
      description: row.description || undefined,
      enabled: Boolean(row.enabled),
      flagType: row.flagType as 'boolean' | 'string' | 'number',
      valueA: JSON.parse(row.valueA),
      valueB: JSON.parse(row.valueB),
      targeting: JSON.parse(row.targeting),
      defaultValue: row.defaultValue as 'A' | 'B',
      // Percentage rollout (defaults for backward compatibility)
      rolloutEnabled: row.rolloutEnabled != null ? Boolean(row.rolloutEnabled) : false,
      rolloutPercentageA: row.rolloutPercentageA ?? 100,
      rolloutPercentageB: row.rolloutPercentageB ?? 0,
      version: row.version,
      isActive: Boolean(row.isActive),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
