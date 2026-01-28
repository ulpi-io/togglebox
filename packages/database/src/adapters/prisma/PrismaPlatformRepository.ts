/**
 * Prisma adapter for platform operations.
 *
 * @remarks
 * Implements `IPlatformRepository` using Prisma ORM for SQL databases.
 * Supports MySQL, PostgreSQL, and SQLite with offset-based pagination.
 */

import { PrismaClient } from '.prisma/client-database';
import { Platform } from '@togglebox/core';
import {
  IPlatformRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  OffsetPaginatedResult,
} from '../../interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * Prisma implementation of platform repository.
 *
 * @remarks
 * Uses Prisma Client for type-safe database operations.
 * Implements offset-based pagination (SQL LIMIT/OFFSET).
 */
export class PrismaPlatformRepository implements IPlatformRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new platform with auto-generated ID.
   *
   * @throws {Error} If platform with same name already exists (Prisma P2002 error)
   */
  async createPlatform(platform: Omit<Platform, 'id'>): Promise<Platform> {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    try {
      const created = await this.prisma.platform.create({
        data: {
          id,
          name: platform.name,
          description: platform.description,
          createdAt,
        },
      });

      return {
        id: created.id,
        name: created.name,
        description: created.description || undefined,
        createdAt: created.createdAt,
      };
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new Error(`Platform ${platform.name} already exists`);
      }
      throw error;
    }
  }

  async getPlatform(name: string): Promise<Platform | null> {
    const platform = await this.prisma.platform.findUnique({
      where: { name },
    });

    if (!platform) {
      return null;
    }

    return {
      id: platform.id,
      name: platform.name,
      description: platform.description || undefined,
      createdAt: platform.createdAt,
    };
  }

  /**
   * Lists platforms with optional pagination.
   *
   * @remarks
   * **Pagination:** Optional - fetches ALL items if not provided, uses LIMIT/OFFSET if provided.
   * **Sorting:** Results sorted by createdAt descending (newest first).
   * **Count Query:** Separate COUNT(*) query for total (may be slow for large tables).
   */
  async listPlatforms(
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<Platform>> {
    // SECURITY: If no pagination requested, apply hard limit to prevent unbounded queries
    // Skip COUNT query since we're fetching all items anyway
    if (!pagination) {
      const HARD_LIMIT = 100;
      const platforms = await this.prisma.platform.findMany({
        orderBy: { createdAt: 'desc' },
        take: HARD_LIMIT,
      });

      const items = platforms.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        createdAt: p.createdAt,
      }));

      // Total is derived from items.length - no extra COUNT query needed
      return { items, total: items.length };
    }

    // Explicit pagination: get total count for UI (run in parallel with query)
    const params = pagination as OffsetPaginationParams;

    const [platforms, total] = await Promise.all([
      this.prisma.platform.findMany({
        orderBy: { createdAt: 'desc' },
        skip: params.offset,
        take: params.limit,
      }),
      this.prisma.platform.count(),
    ]);

    const items = platforms.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      createdAt: p.createdAt,
    }));

    return { items, total };
  }

  async deletePlatform(name: string): Promise<boolean> {
    try {
      await this.prisma.platform.delete({
        where: { name },
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
