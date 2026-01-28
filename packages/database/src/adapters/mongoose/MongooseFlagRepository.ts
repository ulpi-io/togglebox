/**
 * Mongoose adapter for the Flag model (2-value, country/language targeting).
 *
 * @remarks
 * Implements `IFlagRepository` from @togglebox/flags package.
 * This is the 2-value model with exactly 2 values (A/B).
 */

import type {
  Flag,
  CreateFlag,
  UpdateFlag,
  UpdateRollout,
} from '@togglebox/flags';
import type { IFlagRepository, FlagPage } from '@togglebox/flags';
import { FlagModel, type IFlagDocument } from './schemas';

/**
 * Mongoose implementation of the Feature Flag repository.
 *
 * @remarks
 * Schema:
 * - Unique index on (platform, environment, flagKey, version)
 * - Index on (platform, environment, flagKey, isActive) for finding active version
 * - Complex fields (targeting) stored as JSON strings
 */
export class MongooseFlagRepository implements IFlagRepository {
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

    const doc = new FlagModel({
      ...flag,
      targeting: JSON.stringify(flag.targeting),
    });

    await doc.save();

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

    // Parse current version and increment
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
    await FlagModel.updateOne(
      {
        platform,
        environment,
        flagKey,
        version: current.version,
      },
      { $set: { isActive: false } }
    );

    // Create new version
    const doc = new FlagModel({
      ...newFlag,
      targeting: JSON.stringify(newFlag.targeting),
    });

    await doc.save();

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

    await FlagModel.updateOne(
      {
        platform,
        environment,
        flagKey,
        version: current.version,
        isActive: true,
      },
      { $set: { enabled, updatedAt: now } }
    );

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
    const doc = await FlagModel.findOne({
      platform,
      environment,
      flagKey,
      isActive: true,
    });

    if (!doc) {
      return null;
    }

    return this.docToFlag(doc);
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
    const doc = await FlagModel.findOne({
      platform,
      environment,
      flagKey,
      version,
    });

    if (!doc) {
      return null;
    }

    return this.docToFlag(doc);
  }

  /**
   * List all active Feature Flags for a platform+environment.
   */
  async listActive(
    platform: string,
    environment: string,
    limit?: number,
    cursor?: string
  ): Promise<FlagPage> {
    const pageSize = limit || 100;
    const skip = cursor ? parseInt(Buffer.from(cursor, 'base64').toString(), 10) : 0;

    const docs = await FlagModel.find({
      platform,
      environment,
      isActive: true,
    })
      .skip(skip)
      .limit(pageSize + 1); // Fetch one extra to check if there's more

    const hasMore = docs.length > pageSize;
    const items = docs.slice(0, pageSize).map(doc => this.docToFlag(doc));
    const nextCursor = hasMore
      ? Buffer.from(String(skip + pageSize)).toString('base64')
      : undefined;

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
    const docs = await FlagModel.find({
      platform,
      environment,
      flagKey,
    }).sort({ version: -1 }); // Newest first

    return docs.map(doc => this.docToFlag(doc));
  }

  /**
   * Delete a Feature Flag and all its versions.
   */
  async delete(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<void> {
    const result = await FlagModel.deleteMany({
      platform,
      environment,
      flagKey,
    });

    if (result.deletedCount === 0) {
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

    await FlagModel.updateOne(
      {
        platform,
        environment,
        flagKey,
        version: current.version,
        isActive: true,
      },
      {
        $set: {
          rolloutEnabled: settings.rolloutEnabled ?? current.rolloutEnabled,
          rolloutPercentageA: settings.rolloutPercentageA ?? current.rolloutPercentageA,
          rolloutPercentageB: settings.rolloutPercentageB ?? current.rolloutPercentageB,
          updatedAt: now,
        },
      }
    );

    return {
      ...current,
      rolloutEnabled: settings.rolloutEnabled ?? current.rolloutEnabled,
      rolloutPercentageA: settings.rolloutPercentageA ?? current.rolloutPercentageA,
      rolloutPercentageB: settings.rolloutPercentageB ?? current.rolloutPercentageB,
      updatedAt: now,
    };
  }

  /**
   * Safely parse JSON with fallback value.
   * Prevents crashes from corrupted or malformed data.
   */
  private safeParse<T>(raw: string, fallback: T): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Convert Mongoose document to Flag type.
   * Includes defaults for rollout fields for backward compatibility.
   */
  private docToFlag(doc: IFlagDocument): Flag {
    return {
      platform: doc.platform,
      environment: doc.environment,
      flagKey: doc.flagKey,
      name: doc.name,
      description: doc.description,
      enabled: doc.enabled,
      flagType: doc.flagType,
      valueA: doc.valueA,
      valueB: doc.valueB,
      targeting: this.safeParse(doc.targeting, { countries: [], forceIncludeUsers: [], forceExcludeUsers: [] }),
      defaultValue: doc.defaultValue,
      // Percentage rollout (defaults for backward compatibility)
      rolloutEnabled: doc.rolloutEnabled ?? false,
      rolloutPercentageA: doc.rolloutPercentageA ?? 100,
      rolloutPercentageB: doc.rolloutPercentageB ?? 0,
      version: doc.version,
      isActive: doc.isActive,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
