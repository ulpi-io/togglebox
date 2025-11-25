/**
 * Prisma adapter for feature flag operations.
 *
 * @remarks
 * Implements `IFeatureFlagRepository` using Prisma ORM for SQL databases.
 * Handles JSON array serialization for targeting fields and phased rollout logic.
 */

import { PrismaClient } from '.prisma/client-database';
import { FeatureFlag } from '@togglebox/core';
import { IFeatureFlagRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';

/**
 * Prisma implementation of feature flag repository.
 *
 * @remarks
 * **JSON Array Handling:** Targeting arrays stored as JSON strings, parsed/stringified automatically.
 * **Dual-Mode Pagination:** Returns array if no pagination, returns paginated result if pagination provided.
 * **Phased Rollouts:** Supports simple, percentage, and targeted rollout strategies.
 * **Composite Index:** Uses (platform + environment + flagName) for unique constraint.
 */
export class PrismaFeatureFlagRepository implements IFeatureFlagRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new feature flag.
   *
   * @param featureFlag - Feature flag data (createdAt and updatedAt are auto-generated)
   * @returns Created feature flag with generated timestamps
   *
   * @remarks
   * **PERFORMANCE NOTE**: Uses select query to get only platformId instead of full platform.
   * Controller validation ensures platform exists, but we still need the ID for foreign key.
   *
   * @throws {Error} If feature flag already exists (duplicate key error)
   * @throws {Error} If platform not found (should not happen if controller validates correctly)
   */
  async createFeatureFlag(
    featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    const timestamp = new Date().toISOString();

    // Get platformId using select query - only fetch the ID field we need
    // Controller already validated platform exists, so this should always succeed
    const platform = await this.prisma.platform.findUnique({
      where: { name: featureFlag.platform },
      select: { id: true }, // Only select the ID field we need
    });

    if (!platform) {
      // This should never happen if controller validates correctly
      throw new Error(`Platform ${featureFlag.platform} not found`);
    }

    try {
      const created = await this.prisma.featureFlag.create({
        data: {
          platform: featureFlag.platform,
          environment: featureFlag.environment,
          platformId: platform.id,
          flagName: featureFlag.flagName,
          enabled: featureFlag.enabled ?? false,
          description: featureFlag.description,
          createdBy: featureFlag.createdBy,
          createdAt: timestamp,
          updatedAt: timestamp,
          rolloutType: featureFlag.rolloutType ?? 'simple',
          rolloutPercentage: featureFlag.rolloutPercentage,
          targetUserIds: JSON.stringify(featureFlag.targetUserIds ?? []),
          excludeUserIds: JSON.stringify(featureFlag.excludeUserIds ?? []),
          targetCountries: JSON.stringify(featureFlag.targetCountries ?? []),
          targetLanguages: JSON.stringify(featureFlag.targetLanguages ?? []),
        },
      });

      return this.mapToFeatureFlag(created);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error(
          `Feature flag ${featureFlag.flagName} already exists for platform ${featureFlag.platform} and environment ${featureFlag.environment}`
        );
      }
      throw error;
    }
  }

  /**
   * Gets feature flag by composite key.
   *
   * @remarks
   * Uses composite unique index (platform + environment + flagName).
   * JSON arrays are deserialized by private `mapToFeatureFlag` helper.
   */
  async getFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<FeatureFlag | null> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        platform_environment_flagName: { platform, environment, flagName },
      },
    });

    if (!flag) {
      return null;
    }

    return this.mapToFeatureFlag(flag);
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
   *
   * **Use Cases:**
   * - SDK clients: Call without pagination to get all flags for evaluation
   * - Admin UI: Call with pagination to browse large flag lists
   *
   * **Sorting:** By flagName ascending (alphabetical order).
   */
  async listFeatureFlags(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<FeatureFlag>> {
    // Get total count for metadata
    const total = await this.prisma.featureFlag.count({
      where: { platform, environment },
    });

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const flags = await this.prisma.featureFlag.findMany({
        where: { platform, environment },
        orderBy: { flagName: 'asc' },
        // No skip/take - fetch all
      });

      const items = flags.map((f: unknown) => this.mapToFeatureFlag(f));

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const flags = await this.prisma.featureFlag.findMany({
      where: { platform, environment },
      orderBy: { flagName: 'asc' },
      skip: params.offset,
      take: params.limit,
    });

    const items = flags.map((f: unknown) => this.mapToFeatureFlag(f));

    return { items, total };
  }

  /**
   * Updates feature flag with partial changes.
   *
   * @param updates - Partial feature flag updates
   * @returns Updated feature flag, or null if not found
   *
   * @remarks
   * **Array Serialization:** Targeting arrays (targetUserIds, excludeUserIds, etc.) are
   * automatically JSON-stringified before database storage.
   *
   * **Common Update Patterns:**
   * - Toggle flag: `{ enabled: true/false }`
   * - Change rollout: `{ rolloutType: 'percentage', rolloutPercentage: 50 }`
   * - Target users: `{ rolloutType: 'targeted', targetUserIds: ['user1', 'user2'] }`
   *
   * @throws {Error} If database update fails (Prisma error other than P2025)
   */
  async updateFeatureFlag(
    platform: string,
    environment: string,
    flagName: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag | null> {
    const updatedAt = new Date().toISOString();

    // Serialize array fields if present
    const serializedUpdates: Record<string, unknown> = { ...updates };
    if (updates.targetUserIds)
      serializedUpdates['targetUserIds'] = JSON.stringify(updates.targetUserIds);
    if (updates.excludeUserIds)
      serializedUpdates['excludeUserIds'] = JSON.stringify(updates.excludeUserIds);
    if (updates.targetCountries)
      serializedUpdates['targetCountries'] = JSON.stringify(updates.targetCountries);
    if (updates.targetLanguages)
      serializedUpdates['targetLanguages'] = JSON.stringify(updates.targetLanguages);

    try {
      const updated = await this.prisma.featureFlag.update({
        where: {
          platform_environment_flagName: { platform, environment, flagName },
        },
        data: {
          ...serializedUpdates,
          rolloutType: updates.rolloutType,
          updatedAt,
        },
      });

      return this.mapToFeatureFlag(updated);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        // Record not found
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes a feature flag.
   *
   * @returns true if deleted or already doesn't exist (idempotent operation)
   *
   * @remarks
   * **Idempotent:** Returns true even if flag doesn't exist (Prisma P2025 error).
   * This makes delete operations safe to retry without error handling.
   */
  async deleteFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<boolean> {
    try {
      await this.prisma.featureFlag.delete({
        where: {
          platform_environment_flagName: { platform, environment, flagName },
        },
      });
      return true;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        // Record not found - consider it a successful deletion
        return true;
      }
      throw error;
    }
  }

  /**
   * Maps Prisma model to FeatureFlag domain type.
   *
   * @param flag - Raw Prisma feature flag record
   * @returns Typed FeatureFlag with deserialized JSON arrays
   *
   * @remarks
   * **JSON Deserialization:**
   * Parses JSON string arrays (targetUserIds, excludeUserIds, etc.) back to arrays.
   * Empty arrays are converted to undefined for cleaner API responses.
   *
   * **Null Handling:**
   * Database nulls converted to undefined for consistency with TypeScript optionals.
   */
  private mapToFeatureFlag(flag: unknown): FeatureFlag {
    const f = flag as Record<string, unknown>;
    const targetUserIds = JSON.parse((f['targetUserIds'] as string) || '[]') as string[];
    const excludeUserIds = JSON.parse((f['excludeUserIds'] as string) || '[]') as string[];
    const targetCountries = JSON.parse((f['targetCountries'] as string) || '[]') as string[];
    const targetLanguages = JSON.parse((f['targetLanguages'] as string) || '[]') as string[];

    return {
      platform: f['platform'] as string,
      environment: f['environment'] as string,
      flagName: f['flagName'] as string,
      enabled: f['enabled'] as boolean,
      description: (f['description'] as string | null) || undefined,
      createdBy: f['createdBy'] as string,
      createdAt: f['createdAt'] as string,
      updatedAt: (f['updatedAt'] as string | null) || undefined,
      rolloutType: f['rolloutType'] as 'simple' | 'percentage' | 'targeted',
      rolloutPercentage: (f['rolloutPercentage'] as number | null) || undefined,
      targetUserIds: targetUserIds.length > 0 ? targetUserIds : undefined,
      excludeUserIds: excludeUserIds.length > 0 ? excludeUserIds : undefined,
      targetCountries: targetCountries.length > 0 ? targetCountries : undefined,
      targetLanguages: targetLanguages.length > 0 ? targetLanguages : undefined,
    };
  }
}
