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

import { PrismaClient } from ".prisma/client-database";
import { DatabaseRepositories, ThreeTierRepositories } from "../../factory";
import { PrismaPlatformRepository } from "./PrismaPlatformRepository";
import { PrismaEnvironmentRepository } from "./PrismaEnvironmentRepository";
import { PrismaConfigRepository } from "./PrismaConfigRepository";
import { PrismaUsageRepository } from "./PrismaUsageRepository";
import { PrismaFlagRepository } from "./PrismaFlagRepository";
import { PrismaExperimentRepository } from "./PrismaExperimentRepository";
import { PrismaStatsRepository } from "./PrismaStatsRepository";
import { logger } from "@togglebox/shared";

export * from "./PrismaPlatformRepository";
export * from "./PrismaEnvironmentRepository";
export * from "./PrismaConfigRepository";
export * from "./PrismaUsageRepository";
export * from "./PrismaFlagRepository";
export * from "./PrismaExperimentRepository";
export * from "./PrismaStatsRepository";

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
  isSQLite: boolean = false,
): DatabaseRepositories {
  // Parse connection pool configuration from environment
  const connectionLimit = parseInt(
    process.env["DATABASE_CONNECTION_LIMIT"] || "10",
    10,
  );
  const poolTimeout = parseInt(
    process.env["DATABASE_POOL_TIMEOUT"] || "10",
    10,
  );

  // Construct connection URL with pool parameters for non-SQLite databases
  let finalConnectionUrl = connectionUrl;
  if (!isSQLite && !connectionUrl.includes("connection_limit")) {
    const separator = connectionUrl.includes("?") ? "&" : "?";
    finalConnectionUrl = `${connectionUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: finalConnectionUrl,
      },
    },
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  // Enable foreign key constraints for SQLite
  if (isSQLite) {
    prisma
      .$executeRawUnsafe("PRAGMA foreign_keys = ON;")
      .catch((error: unknown) => {
        logger.warn(
          "Failed to enable SQLite foreign key constraints",
          error as Record<string, unknown>,
        );
      });
  }

  return {
    platform: new PrismaPlatformRepository(prisma),
    environment: new PrismaEnvironmentRepository(prisma),
    config: new PrismaConfigRepository(prisma),
    usage: new PrismaUsageRepository(prisma),
  };
}

/**
 * Creates Prisma-based three-tier repository instances.
 *
 * @param connectionUrl - Database connection URL
 * @param isSQLite - Whether this is a SQLite database (requires special handling)
 * @returns Three-tier repositories (Flag, Experiment, Stats)
 *
 * @remarks
 * Three-tier architecture repositories:
 * - Tier 2: Feature Flags (2-value model with targeting)
 * - Tier 3: Experiments (multi-variant A/B testing)
 * - Stats: Analytics for configs, flags, and experiments
 *
 * Connection pool configuration:
 * - **MySQL/PostgreSQL**: Pool size configured via connection URL or environment variables
 *   - connection_limit (default: 10 for serverless, unlimited for traditional)
 *   - pool_timeout (default: 10 seconds)
 * - **SQLite**: No connection pooling (single connection per process)
 *
 * @example
 * ```ts
 * // MySQL
 * const mysqlRepos = createPrismaThreeTierRepositories(
 *   'mysql://user:pass@localhost:3306/togglebox',
 *   false
 * );
 *
 * // PostgreSQL
 * const pgRepos = createPrismaThreeTierRepositories(
 *   'postgresql://user:pass@localhost:5432/togglebox',
 *   false
 * );
 *
 * // SQLite
 * const sqliteRepos = createPrismaThreeTierRepositories(
 *   'file:./dev.db',
 *   true
 * );
 *
 * // Feature Flags
 * const flag = await mysqlRepos.flag.create({
 *   platform: 'web',
 *   environment: 'production',
 *   flagKey: 'dark-mode',
 *   name: 'Dark Mode',
 *   flagType: 'boolean',
 *   valueA: true,
 *   valueB: false,
 *   createdBy: 'admin@example.com',
 * });
 *
 * // Experiments
 * const experiment = await mysqlRepos.experiment.create({
 *   platform: 'web',
 *   environment: 'production',
 *   experimentKey: 'checkout-test',
 *   name: 'Checkout Flow Test',
 *   hypothesis: 'Single-page checkout increases conversions',
 *   variations: [...],
 *   trafficAllocation: [...],
 *   primaryMetric: {...},
 *   createdBy: 'product@example.com',
 * });
 *
 * // Stats
 * await mysqlRepos.stats.incrementFlagEvaluation('web', 'production', 'dark-mode', 'A', 'user-123');
 * ```
 */
export function createPrismaThreeTierRepositories(
  connectionUrl: string,
  isSQLite: boolean = false,
): ThreeTierRepositories {
  // Parse connection pool configuration from environment
  const connectionLimit = parseInt(
    process.env["DATABASE_CONNECTION_LIMIT"] || "10",
    10,
  );
  const poolTimeout = parseInt(
    process.env["DATABASE_POOL_TIMEOUT"] || "10",
    10,
  );

  // Construct connection URL with pool parameters for non-SQLite databases
  let finalConnectionUrl = connectionUrl;
  if (!isSQLite && !connectionUrl.includes("connection_limit")) {
    const separator = connectionUrl.includes("?") ? "&" : "?";
    finalConnectionUrl = `${connectionUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: finalConnectionUrl,
      },
    },
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  // Enable foreign key constraints for SQLite
  if (isSQLite) {
    prisma
      .$executeRawUnsafe("PRAGMA foreign_keys = ON;")
      .catch((error: unknown) => {
        logger.warn(
          "Failed to enable SQLite foreign key constraints",
          error as Record<string, unknown>,
        );
      });
  }

  return {
    flag: new PrismaFlagRepository(prisma),
    experiment: new PrismaExperimentRepository(prisma),
    stats: new PrismaStatsRepository(prisma),
  };
}
