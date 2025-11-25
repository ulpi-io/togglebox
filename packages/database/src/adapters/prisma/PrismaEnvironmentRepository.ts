/**
 * Prisma adapter for environment operations.
 *
 * @remarks
 * Implements `IEnvironmentRepository` using Prisma ORM for SQL databases.
 * Handles foreign key relationships with platforms.
 */

import { PrismaClient } from '.prisma/client-database';
import { Environment } from '@togglebox/core';
import {
  IEnvironmentRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  OffsetPaginatedResult,
} from '../../interfaces';

/**
 * Prisma implementation of environment repository.
 *
 * @remarks
 * Uses composite unique index (platform + environment) for lookups.
 * Requires platform foreign key for referential integrity.
 */
export class PrismaEnvironmentRepository implements IEnvironmentRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new environment with foreign key to platform.
   *
   * @throws {Error} If platform not found
   * @throws {Error} If environment already exists (Prisma P2002 error)
   */
  async createEnvironment(environment: Omit<Environment, 'createdAt'>): Promise<Environment> {
    const createdAt = new Date().toISOString();

    // Look up the platform to get its ID for foreign key
    const platform = await this.prisma.platform.findUnique({
      where: { name: environment.platform },
    });

    if (!platform) {
      throw new Error(`Platform ${environment.platform} not found`);
    }

    try {
      const created = await this.prisma.environment.create({
        data: {
          platform: environment.platform,
          environment: environment.environment,
          platformId: platform.id,
          description: environment.description,
          createdAt,
        },
      });

      return {
        platform: created.platform,
        environment: created.environment,
        description: created.description || undefined,
        createdAt: created.createdAt,
      };
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new Error(
          `Environment ${environment.environment} already exists for platform ${environment.platform}`
        );
      }
      throw error;
    }
  }

  /**
   * Gets environment by composite key (platform + environment).
   *
   * @remarks
   * Uses Prisma composite unique index for efficient lookup.
   */
  async getEnvironment(platform: string, environment: string): Promise<Environment | null> {
    const env = await this.prisma.environment.findUnique({
      where: {
        platform_environment: { platform, environment },
      },
    });

    if (!env) {
      return null;
    }

    return {
      platform: env.platform,
      environment: env.environment,
      description: env.description || undefined,
      createdAt: env.createdAt,
    };
  }

  /**
   * Lists environments for a platform with optional pagination.
   *
   * @remarks
   * **Filtering:** WHERE clause filters by platform.
   * **Pagination:** Optional - fetches ALL items if not provided, single page if provided.
   * **Sorting:** By createdAt descending (newest first).
   */
  async listEnvironments(
    platform: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<Environment>> {
    // Get total count for metadata
    const total = await this.prisma.environment.count({
      where: { platform },
    });

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const environments = await this.prisma.environment.findMany({
        where: { platform },
        orderBy: { createdAt: 'desc' },
        // No skip/take - fetch all
      });

      const items = environments.map((e) => ({
        platform: e.platform,
        environment: e.environment,
        description: e.description || undefined,
        createdAt: e.createdAt,
      }));

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const environments = await this.prisma.environment.findMany({
      where: { platform },
      orderBy: { createdAt: 'desc' },
      skip: params.offset,
      take: params.limit,
    });

    const items = environments.map((e) => ({
      platform: e.platform,
      environment: e.environment,
      description: e.description || undefined,
      createdAt: e.createdAt,
    }));

    return { items, total };
  }

  async deleteEnvironment(platform: string, environment: string): Promise<boolean> {
    try {
      await this.prisma.environment.delete({
        where: {
          platform_environment: { platform, environment },
        },
      });
      return true;
    } catch (error: unknown) {
      // Prisma P2025 error: Record not found
      if ((error as { code?: string }).code === 'P2025') {
        return false;
      }
      throw error;
    }
  }
}
