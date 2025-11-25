/**
 * Cloudflare D1 adapter for environment operations.
 *
 * @remarks
 * Implements `IEnvironmentRepository` using Cloudflare D1 database.
 * Handles foreign key relationships with platforms.
 */

import { Environment } from '@togglebox/core';
import { IEnvironmentRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';

/**
 * D1 implementation of environment repository.
 *
 * @remarks
 * **Foreign Keys:** Uses platformId for referential integrity.
 * **Composite Unique Constraint:** (platform + environment) prevents duplicates.
 * **Offset Pagination:** Uses SQL LIMIT/OFFSET (same as Prisma).
 */
export class D1EnvironmentRepository implements IEnvironmentRepository {
  constructor(private db: D1Database) {}

  /**
   * Creates a new environment with foreign key to platform.
   *
   * @throws {Error} If platform not found
   * @throws {Error} If environment already exists (SQLite UNIQUE constraint)
   */
  async createEnvironment(environment: Omit<Environment, 'createdAt'>): Promise<Environment> {
    const createdAt = new Date().toISOString();

    // Get platformId from platform name
    const platform = await this.db
      .prepare('SELECT id FROM platforms WHERE name = ?1')
      .bind(environment.platform)
      .first<{ id: string }>();

    if (!platform) {
      throw new Error(`Platform ${environment.platform} not found`);
    }

    try {
      await this.db
        .prepare(
          'INSERT INTO environments (platform, environment, platformId, description, createdAt) VALUES (?1, ?2, ?3, ?4, ?5)'
        )
        .bind(
          environment.platform,
          environment.environment,
          platform.id,
          environment.description || null,
          createdAt
        )
        .run();

      return {
        platform: environment.platform,
        environment: environment.environment,
        description: environment.description,
        createdAt,
      };
    } catch (error: unknown) {
      if ((error as Error).message?.includes('UNIQUE constraint failed')) {
        throw new Error(`Environment ${environment.environment} already exists for platform ${environment.platform}`);
      }
      throw error;
    }
  }

  /**
   * Gets environment by composite key (platform + environment).
   *
   * @remarks
   * Uses composite WHERE clause for unique lookup.
   */
  async getEnvironment(platform: string, environment: string): Promise<Environment | null> {
    const result = await this.db
      .prepare(
        'SELECT platform, environment, description, createdAt FROM environments WHERE platform = ?1 AND environment = ?2'
      )
      .bind(platform, environment)
      .first<Environment>();

    if (!result) {
      return null;
    }

    return {
      platform: result.platform,
      environment: result.environment,
      description: result.description || undefined,
      createdAt: result.createdAt,
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
    const countResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM environments WHERE platform = ?1')
      .bind(platform)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const result = await this.db
        .prepare(
          'SELECT platform, environment, description, createdAt FROM environments WHERE platform = ?1 ORDER BY createdAt DESC'
        )
        .bind(platform)
        .all<Environment>();

      const items = result.results
        ? result.results.map((e) => ({
            platform: e.platform,
            environment: e.environment,
            description: e.description || undefined,
            createdAt: e.createdAt,
          }))
        : [];

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const result = await this.db
      .prepare(
        'SELECT platform, environment, description, createdAt FROM environments WHERE platform = ?1 ORDER BY createdAt DESC LIMIT ?2 OFFSET ?3'
      )
      .bind(platform, params.limit, params.offset)
      .all<Environment>();

    const items = result.results
      ? result.results.map((e) => ({
          platform: e.platform,
          environment: e.environment,
          description: e.description || undefined,
          createdAt: e.createdAt,
        }))
      : [];

    return { items, total };
  }

  async deleteEnvironment(platform: string, environment: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM environments WHERE platform = ?1 AND environment = ?2')
      .bind(platform, environment)
      .run();

    return result.meta.rows_written > 0;
  }
}
