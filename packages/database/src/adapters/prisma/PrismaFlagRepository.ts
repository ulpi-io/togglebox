/**
 * Prisma adapter for the Flag model (2-value, country/language targeting).
 *
 * @remarks
 * Implements `IFlagRepository` from @togglebox/flags package.
 * This is the 2-value model with exactly 2 values (A/B).
 */

import { PrismaClient } from ".prisma/client-database";
import type {
  Flag,
  CreateFlag,
  UpdateFlag,
  UpdateRollout,
} from "@togglebox/flags";
import type { IFlagRepository, FlagPage } from "@togglebox/flags";
import { parseCursor, encodeCursor } from "../../utils/cursor";

/**
 * Prisma implementation of the Feature Flag repository.
 *
 * @remarks
 * Database schema:
 * - Composite unique index: (platform, environment, flagKey, version)
 * - Index on (platform, environment, isActive) for fast active flag queries
 * - JSON fields stored as strings (targeting, valueA, valueB)
 */
export class PrismaFlagRepository implements IFlagRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new Feature Flag (version 1.0.0).
   */
  async create(data: CreateFlag): Promise<Flag> {
    const now = new Date().toISOString();
    const version = "1.0.0";

    const flag: Flag = {
      platform: data.platform,
      environment: data.environment,
      flagKey: data.flagKey,
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? false,
      flagType: data.flagType ?? "boolean",
      valueA: data.valueA ?? true,
      valueB: data.valueB ?? false,
      targeting: data.targeting ?? {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      defaultValue: data.defaultValue ?? "B",
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

    await this.prisma.flag.create({
      data: {
        platform: flag.platform,
        environment: flag.environment,
        flagKey: flag.flagKey,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        flagType: flag.flagType,
        valueA: JSON.stringify(flag.valueA),
        valueB: JSON.stringify(flag.valueB),
        targeting: JSON.stringify(flag.targeting),
        defaultValue: flag.defaultValue,
        rolloutEnabled: flag.rolloutEnabled,
        rolloutPercentageA: flag.rolloutPercentageA,
        rolloutPercentageB: flag.rolloutPercentageB,
        version: flag.version,
        isActive: flag.isActive,
        createdBy: flag.createdBy,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      },
    });

    return flag;
  }

  /**
   * Updates a Feature Flag by creating a new version.
   */
  async update(
    platform: string,
    environment: string,
    flagKey: string,
    data: UpdateFlag,
  ): Promise<Flag> {
    // Get current active version
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    // Parse current version and increment
    const [major, minor, patch] = current.version.split(".").map(Number);
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
    await this.prisma.flag.update({
      where: {
        platform_environment_flagKey_version: {
          platform,
          environment,
          flagKey,
          version: current.version,
        },
      },
      data: { isActive: false },
    });

    // Create new version
    await this.prisma.flag.create({
      data: {
        platform: newFlag.platform,
        environment: newFlag.environment,
        flagKey: newFlag.flagKey,
        name: newFlag.name,
        description: newFlag.description,
        enabled: newFlag.enabled,
        flagType: newFlag.flagType,
        valueA: JSON.stringify(newFlag.valueA),
        valueB: JSON.stringify(newFlag.valueB),
        targeting: JSON.stringify(newFlag.targeting),
        defaultValue: newFlag.defaultValue,
        rolloutEnabled: newFlag.rolloutEnabled,
        rolloutPercentageA: newFlag.rolloutPercentageA,
        rolloutPercentageB: newFlag.rolloutPercentageB,
        version: newFlag.version,
        isActive: newFlag.isActive,
        createdBy: newFlag.createdBy,
        createdAt: newFlag.createdAt,
        updatedAt: newFlag.updatedAt,
      },
    });

    return newFlag;
  }

  /**
   * Toggle a flag's enabled state (in-place update, no new version).
   */
  async toggle(
    platform: string,
    environment: string,
    flagKey: string,
    enabled: boolean,
  ): Promise<Flag> {
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    const now = new Date().toISOString();

    await this.prisma.flag.update({
      where: {
        platform_environment_flagKey_version: {
          platform,
          environment,
          flagKey,
          version: current.version,
        },
      },
      data: {
        enabled,
        updatedAt: now,
      },
    });

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
    flagKey: string,
  ): Promise<Flag | null> {
    const flag = await this.prisma.flag.findFirst({
      where: {
        platform,
        environment,
        flagKey,
        isActive: true,
      },
      orderBy: { version: "desc" },
    });

    if (!flag) {
      return null;
    }

    return this.dbToFlag(flag);
  }

  /**
   * Get a specific version of a Feature Flag.
   */
  async getVersion(
    platform: string,
    environment: string,
    flagKey: string,
    version: string,
  ): Promise<Flag | null> {
    const flag = await this.prisma.flag.findUnique({
      where: {
        platform_environment_flagKey_version: {
          platform,
          environment,
          flagKey,
          version,
        },
      },
    });

    if (!flag) {
      return null;
    }

    return this.dbToFlag(flag);
  }

  /**
   * List all active Feature Flags for a platform+environment.
   */
  async listActive(
    platform: string,
    environment: string,
    limit: number = 100,
    cursor?: string,
  ): Promise<FlagPage> {
    // Parse cursor as offset (validates and throws on malformed cursors)
    const offset = parseCursor(cursor);

    const flags = await this.prisma.flag.findMany({
      where: {
        platform,
        environment,
        isActive: true,
      },
      orderBy: { flagKey: "asc" },
      skip: offset,
      take: limit,
    });

    const items = flags.map((f) => this.dbToFlag(f));
    const nextCursor =
      flags.length === limit ? encodeCursor(offset + limit) : undefined;

    return {
      items,
      nextCursor,
      hasMore: flags.length === limit,
    };
  }

  /**
   * List all versions of a Feature Flag.
   */
  async listVersions(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag[]> {
    const flags = await this.prisma.flag.findMany({
      where: {
        platform,
        environment,
        flagKey,
      },
      orderBy: { version: "desc" },
    });

    return flags.map((f) => this.dbToFlag(f));
  }

  /**
   * Delete a Feature Flag and all its versions.
   */
  async delete(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<void> {
    const count = await this.prisma.flag.deleteMany({
      where: {
        platform,
        environment,
        flagKey,
      },
    });

    if (count.count === 0) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }
  }

  /**
   * Check if a Feature Flag exists.
   */
  async exists(
    platform: string,
    environment: string,
    flagKey: string,
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
    settings: UpdateRollout,
  ): Promise<Flag> {
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    const now = new Date().toISOString();

    await this.prisma.flag.update({
      where: {
        platform_environment_flagKey_version: {
          platform,
          environment,
          flagKey,
          version: current.version,
        },
      },
      data: {
        rolloutEnabled: settings.rolloutEnabled ?? current.rolloutEnabled,
        rolloutPercentageA:
          settings.rolloutPercentageA ?? current.rolloutPercentageA,
        rolloutPercentageB:
          settings.rolloutPercentageB ?? current.rolloutPercentageB,
        updatedAt: now,
      },
    });

    return {
      ...current,
      rolloutEnabled: settings.rolloutEnabled ?? current.rolloutEnabled,
      rolloutPercentageA:
        settings.rolloutPercentageA ?? current.rolloutPercentageA,
      rolloutPercentageB:
        settings.rolloutPercentageB ?? current.rolloutPercentageB,
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
   * Convert database row to Flag type.
   * Includes defaults for rollout fields for backward compatibility.
   */
  private dbToFlag(row: {
    platform: string;
    environment: string;
    flagKey: string;
    name: string;
    description: string | null;
    enabled: boolean;
    flagType: string;
    valueA: string;
    valueB: string;
    targeting: string;
    defaultValue: string;
    rolloutEnabled?: boolean | null;
    rolloutPercentageA?: number | null;
    rolloutPercentageB?: number | null;
    version: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }): Flag {
    return {
      platform: row.platform,
      environment: row.environment,
      flagKey: row.flagKey,
      name: row.name,
      description: row.description || undefined,
      enabled: row.enabled,
      flagType: row.flagType as "boolean" | "string" | "number",
      valueA: this.safeParse(row.valueA, false),
      valueB: this.safeParse(row.valueB, false),
      targeting: this.safeParse(row.targeting, {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      }),
      defaultValue: row.defaultValue as "A" | "B",
      // Percentage rollout (defaults for backward compatibility)
      rolloutEnabled: row.rolloutEnabled ?? false,
      rolloutPercentageA: row.rolloutPercentageA ?? 100,
      rolloutPercentageB: row.rolloutPercentageB ?? 0,
      version: row.version,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
