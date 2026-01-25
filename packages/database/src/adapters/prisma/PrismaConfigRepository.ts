/**
 * Prisma adapter for configuration version operations.
 *
 * @remarks
 * Implements `IConfigRepository` using Prisma ORM for SQL databases.
 * Handles JSON serialization for configuration payloads and versioning logic.
 */

import { PrismaClient } from '.prisma/client-database';
import { Version } from '@togglebox/configs';
import {
  IConfigRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  OffsetPaginatedResult,
} from '../../interfaces';

/**
 * Prisma implementation of configuration repository.
 *
 * @remarks
 * **JSON Handling:** Config stored as JSON string, parsed/stringified automatically.
 * **Versioning:** Auto-generated ISO-8601 timestamps ensure chronological ordering.
 * **Stable Versions:** Index on isStable column for fast latest-stable queries.
 */
export class PrismaConfigRepository implements IConfigRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new configuration version.
   *
   * @param version - Version data (versionTimestamp and createdAt are auto-generated)
   * @returns Created version with generated timestamp
   *
   * @throws {Error} If platform not found
   * @throws {Error} If version timestamp collision occurs (Prisma P2002, extremely rare)
   *
   * @remarks
   * **Performance:** Uses SELECT query to fetch only platformId (not full platform).
   * Controller validation ensures platform exists, so lookup should always succeed.
   */
  async createVersion(version: Omit<Version, 'versionTimestamp' | 'createdAt'>): Promise<Version> {
    const timestamp = new Date().toISOString();

    try {
      // Get platformId using select query - only fetch the ID field we need
      // Controller already validated platform exists, so this should always succeed
      const platform = await this.prisma.platform.findUnique({
        where: { name: version.platform },
        select: { id: true }, // Only select the ID field we need
      });

      if (!platform) {
        // This should never happen if controller validates correctly
        throw new Error(`Platform ${version.platform} not found`);
      }

      const created = await this.prisma.configVersion.create({
        data: {
          platform: version.platform,
          environment: version.environment,
          platformId: platform.id,
          versionTimestamp: timestamp,
          versionLabel: version.versionLabel,
          isStable: version.isStable ?? false,
          config: JSON.stringify(version.config),
          createdBy: version.createdBy,
          createdAt: timestamp,
        },
      });

      return {
        platform: created.platform,
        environment: created.environment,
        versionLabel: created.versionLabel ?? '',
        versionTimestamp: created.versionTimestamp,
        isStable: created.isStable,
        config: JSON.parse(created.config),
        createdBy: created.createdBy,
        createdAt: created.createdAt,
      };
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new Error(
          `Version with timestamp ${timestamp} already exists (extremely rare collision)`
        );
      }
      throw error;
    }
  }

  /**
   * Gets configuration version by versionLabel.
   *
   * @remarks
   * Uses versionLabel as the human-readable identifier for consistency
   * across all database adapters (DynamoDB, Prisma, D1).
   */
  async getVersion(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<Version | null> {
    const version = await this.prisma.configVersion.findFirst({
      where: { platform, environment, versionLabel },
    });

    if (!version) {
      return null;
    }

    return {
      platform: version.platform,
      environment: version.environment,
      versionLabel: version.versionLabel ?? '',
      versionTimestamp: version.versionTimestamp,
      isStable: version.isStable,
      config: JSON.parse(version.config),
      createdBy: version.createdBy,
      createdAt: version.createdAt,
    };
  }

  /**
   * Gets latest stable version for platform and environment.
   *
   * @remarks
   * **Query:** WHERE isStable=true, ORDER BY versionTimestamp DESC, LIMIT 1.
   * **Index:** Requires index on (platform, environment, isStable, versionTimestamp).
   */
  async getLatestStableVersion(platform: string, environment: string): Promise<Version | null> {
    const version = await this.prisma.configVersion.findFirst({
      where: {
        platform,
        environment,
        isStable: true,
      },
      orderBy: { versionTimestamp: 'desc' },
    });

    if (!version) {
      return null;
    }

    return {
      platform: version.platform,
      environment: version.environment,
      versionLabel: version.versionLabel ?? '',
      versionTimestamp: version.versionTimestamp,
      isStable: version.isStable,
      config: JSON.parse(version.config),
      createdBy: version.createdBy,
      createdAt: version.createdAt,
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
    const total = await this.prisma.configVersion.count({
      where: { platform, environment },
    });

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const versions = await this.prisma.configVersion.findMany({
        where: { platform, environment },
        orderBy: { versionTimestamp: 'desc' },
        // No skip/take - fetch all
      });

      const items = versions.map((v) => ({
        platform: v.platform,
        environment: v.environment,
        versionLabel: v.versionLabel ?? '',
        versionTimestamp: v.versionTimestamp,
        isStable: v.isStable,
        config: JSON.parse(v.config),
        createdBy: v.createdBy,
        createdAt: v.createdAt,
      }));

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const versions = await this.prisma.configVersion.findMany({
      where: { platform, environment },
      orderBy: { versionTimestamp: 'desc' },
      skip: params.offset,
      take: params.limit,
    });

    const items = versions.map((v) => ({
      platform: v.platform,
      environment: v.environment,
      versionLabel: v.versionLabel ?? '',
      versionTimestamp: v.versionTimestamp,
      isStable: v.isStable,
      config: JSON.parse(v.config),
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    }));

    return { items, total };
  }

  /**
   * Deletes a configuration version by versionLabel.
   *
   * @remarks
   * Uses versionLabel as the human-readable identifier for consistency
   * across all database adapters (DynamoDB, Prisma, D1).
   *
   * @returns true if deleted, false if version doesn't exist
   */
  async deleteVersion(
    platform: string,
    environment: string,
    versionLabel: string
  ): Promise<boolean> {
    // First find the version by versionLabel to get the versionTimestamp
    const version = await this.prisma.configVersion.findFirst({
      where: { platform, environment, versionLabel },
      select: { versionTimestamp: true },
    });

    if (!version) {
      return false;
    }

    try {
      await this.prisma.configVersion.delete({
        where: {
          platform_environment_versionTimestamp: {
            platform,
            environment,
            versionTimestamp: version.versionTimestamp,
          },
        },
      });
      return true;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        // Record not found (race condition)
        return false;
      }
      throw error;
    }
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
    const version = await this.prisma.configVersion.findFirst({
      where: { platform, environment, versionLabel },
    });

    if (!version) {
      return null;
    }

    // Update the version to be stable
    const updated = await this.prisma.configVersion.update({
      where: {
        platform_environment_versionTimestamp: {
          platform,
          environment,
          versionTimestamp: version.versionTimestamp,
        },
      },
      data: { isStable: true },
    });

    return {
      platform: updated.platform,
      environment: updated.environment,
      versionLabel: updated.versionLabel ?? '',
      versionTimestamp: updated.versionTimestamp,
      isStable: updated.isStable,
      config: JSON.parse(updated.config),
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
    };
  }
}
