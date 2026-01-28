/**
 * Cloudflare D1 adapter for platform operations.
 *
 * @remarks
 * Implements `IPlatformRepository` using Cloudflare D1 database.
 * D1 is Cloudflare's edge-optimized SQLite database for Workers.
 */

import { Platform } from '@togglebox/core';
import { IPlatformRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * D1 implementation of platform repository.
 *
 * @remarks
 * **Edge Deployment:** Optimized for Cloudflare Workers with low-latency access.
 * **SQLite Compatibility:** Uses standard SQLite syntax and constraints.
 * **Offset Pagination:** Uses SQL LIMIT/OFFSET (same as Prisma).
 * **Parameterized Queries:** Uses positional parameters (?1, ?2) for safety.
 */
export class D1PlatformRepository implements IPlatformRepository {
  constructor(private db: D1Database) {}

  /**
   * Creates a new platform with auto-generated ID.
   *
   * @throws {Error} If platform with same name already exists (SQLite UNIQUE constraint)
   *
   * @remarks
   * **Constraint Handling:** D1/SQLite returns "UNIQUE constraint failed" message on duplicates.
   */
  async createPlatform(platform: Omit<Platform, 'id'>): Promise<Platform> {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    try {
      await this.db
        .prepare(
          'INSERT INTO platforms (id, name, description, createdAt) VALUES (?1, ?2, ?3, ?4)'
        )
        .bind(id, platform.name, platform.description || null, createdAt)
        .run();

      return {
        id,
        name: platform.name,
        description: platform.description,
        createdAt,
      };
    } catch (error: unknown) {
      // SQLite error code 19 is CONSTRAINT violation (unique constraint)
      if ((error as Error).message?.includes('UNIQUE constraint failed')) {
        throw new Error(`Platform ${platform.name} already exists`);
      }
      throw error;
    }
  }

  /**
   * Gets platform by unique name.
   *
   * @remarks
   * Uses D1's `.first()` method to return single row or null.
   */
  async getPlatform(name: string): Promise<Platform | null> {
    const result = await this.db
      .prepare('SELECT id, name, description, createdAt FROM platforms WHERE name = ?1')
      .bind(name)
      .first<Platform>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      description: result.description || undefined,
      createdAt: result.createdAt,
    };
  }

  /**
   * Lists platforms with optional pagination.
   *
   * @remarks
   * **Pagination:** Optional - fetches ALL items if not provided, uses LIMIT/OFFSET if provided.
   * **Sorting:** Results sorted by createdAt descending (newest first).
   * **Count Query:** Separate COUNT(*) query for total (standard SQL pattern).
   */
  async listPlatforms(
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<Platform>> {
    // SECURITY: If no pagination requested, apply hard limit to prevent unbounded queries
    // Skip COUNT query since we're fetching all items anyway
    if (!pagination) {
      const HARD_LIMIT = 100;
      const result = await this.db
        .prepare('SELECT id, name, description, createdAt FROM platforms ORDER BY createdAt DESC LIMIT ?1')
        .bind(HARD_LIMIT)
        .all<Platform>();

      const items = result.results
        ? result.results.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || undefined,
            createdAt: p.createdAt,
          }))
        : [];

      // Total is derived from items.length - no extra COUNT query needed
      return { items, total: items.length };
    }

    // Explicit pagination: get total count for UI
    const params = pagination as OffsetPaginationParams;

    const countResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM platforms')
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const result = await this.db
      .prepare('SELECT id, name, description, createdAt FROM platforms ORDER BY createdAt DESC LIMIT ?1 OFFSET ?2')
      .bind(params.limit, params.offset)
      .all<Platform>();

    const items = result.results
      ? result.results.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          createdAt: p.createdAt,
        }))
      : [];

    return { items, total };
  }

  async deletePlatform(name: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM platforms WHERE name = ?1')
      .bind(name)
      .run();

    return result.meta.rows_written > 0;
  }
}
