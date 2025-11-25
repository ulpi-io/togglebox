/**
 * Prisma adapter module for SQL database operations.
 *
 * @module prisma
 *
 * @remarks
 * Provides Prisma repository implementations using Prisma ORM.
 * Supports MySQL, PostgreSQL, and SQLite with connection pooling.
 *
 * **Architecture:**
 * - Full implementations (not thin wrappers like DynamoDB adapters)
 * - Connection pooling for MySQL/PostgreSQL
 * - Foreign key constraints for all databases
 * - Offset-based pagination (SQL LIMIT/OFFSET)
 * - JSON string serialization for complex fields
 *
 * **Key Features:**
 * - Type-safe database access via Prisma Client
 * - Automatic query parameterization (SQL injection prevention)
 * - Connection pool management
 * - Transaction support
 *
 * @example
 * ```ts
 * import { createPrismaRepositories } from './adapters/prisma';
 *
 * const db = createPrismaRepositories('mysql://user:pass@localhost:3306/dbname');
 * const platform = await db.platform.createPlatform({ name: 'web', description: '...' });
 * ```
 */

import { PrismaClient } from '.prisma/client-database';
import { DatabaseRepositories } from '../../factory';
import { PrismaPlatformRepository } from './PrismaPlatformRepository';
import { PrismaEnvironmentRepository } from './PrismaEnvironmentRepository';
import { PrismaConfigRepository } from './PrismaConfigRepository';
import { PrismaFeatureFlagRepository } from './PrismaFeatureFlagRepository';
import { PrismaUsageRepository } from './PrismaUsageRepository';
import { logger } from '@togglebox/shared';

export * from './PrismaPlatformRepository';
export * from './PrismaEnvironmentRepository';
export * from './PrismaConfigRepository';
export * from './PrismaFeatureFlagRepository';
export * from './PrismaUsageRepository';

/**
 * Creates Prisma-based repository instances with configured connection pooling.
 *
 * @param connectionUrl - Database connection URL
 * @param isSQLite - Whether this is a SQLite database (requires special handling)
 * @returns Database repositories
 *
 * @remarks
 * Connection pool configuration:
 * - **MySQL/PostgreSQL**: Pool size configured via connection URL or environment variables
 *   - connection_limit (default: 10 for serverless, unlimited for traditional)
 *   - pool_timeout (default: 10 seconds)
 * - **SQLite**: No connection pooling (single connection per process)
 *
 * Environment variables for connection pool tuning:
 * - `DATABASE_CONNECTION_LIMIT` - Max connections in pool (default: 10)
 * - `DATABASE_POOL_TIMEOUT` - Connection timeout in seconds (default: 10)
 *
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */
export function createPrismaRepositories(
  connectionUrl: string,
  isSQLite: boolean = false
): DatabaseRepositories {
  // Parse connection pool configuration from environment
  const connectionLimit = parseInt(process.env['DATABASE_CONNECTION_LIMIT'] || '10', 10);
  const poolTimeout = parseInt(process.env['DATABASE_POOL_TIMEOUT'] || '10', 10);

  // Construct connection URL with pool parameters for non-SQLite databases
  let finalConnectionUrl = connectionUrl;
  if (!isSQLite && !connectionUrl.includes('connection_limit')) {
    const separator = connectionUrl.includes('?') ? '&' : '?';
    finalConnectionUrl = `${connectionUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: finalConnectionUrl,
      },
    },
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

  // Enable foreign key constraints for SQLite
  if (isSQLite) {
    prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;').catch((error: unknown) => {
      logger.warn('Failed to enable SQLite foreign key constraints', error as Record<string, unknown>);
    });
  }

  return {
    platform: new PrismaPlatformRepository(prisma),
    environment: new PrismaEnvironmentRepository(prisma),
    config: new PrismaConfigRepository(prisma),
    featureFlag: new PrismaFeatureFlagRepository(prisma),
    usage: new PrismaUsageRepository(prisma),
  };
}
