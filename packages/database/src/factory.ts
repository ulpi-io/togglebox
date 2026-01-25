/**
 * Database adapter factory for multi-provider support.
 *
 * @module factory
 *
 * @remarks
 * This module implements the Factory and Adapter patterns to provide a unified interface
 * across multiple database providers. It enables seamless switching between databases
 * without changing application code.
 *
 * **Supported Database Providers:**
 * - **MySQL** - via Prisma (production-ready, connection pooling)
 * - **PostgreSQL** - via Prisma (including Supabase support)
 * - **SQLite** - via Prisma (local development, testing)
 * - **MongoDB** - via Mongoose (document store, schema-less)
 * - **DynamoDB** - via AWS SDK (serverless, single-table design)
 * - **Cloudflare D1** - via D1 binding (edge computing, SQLite at edge)
 *
 * **Architecture Benefits:**
 * - Single codebase supports multiple databases
 * - Swap databases via environment variable (no code changes)
 * - Test with SQLite, deploy with MySQL/PostgreSQL/DynamoDB
 * - Platform-specific optimization (DynamoDB for Lambda, D1 for Workers)
 *
 * **Factory Pattern:**
 * `createDatabaseRepositories()` creates the appropriate adapter based on config.
 * All adapters implement the same interfaces (IPlatformRepository, etc.).
 *
 * **Singleton Pattern:**
 * `getDatabase()` provides a singleton instance for connection pooling and efficiency.
 *
 * @example
 * ```ts
 * // Set database type via environment variable
 * process.env.DB_TYPE = 'mysql';
 * process.env.MYSQL_URL = 'mysql://user:pass@localhost:3306/db';
 *
 * // Get database instance (auto-creates on first call)
 * const db = getDatabase();
 *
 * // Use repositories (same interface regardless of database)
 * const platform = await db.platform.createPlatform({ name: 'web', description: '...' });
 * const config = await db.config.getLatestVersion('web', 'production');
 * ```
 */

import { DatabaseConfig } from './config';
import {
  IPlatformRepository,
  IEnvironmentRepository,
  IConfigRepository,
  IUsageRepository,
} from './interfaces';
import type { IFlagRepository } from '@togglebox/flags';
import type { IExperimentRepository } from '@togglebox/experiments';
import type { IStatsRepository } from '@togglebox/stats';

/**
 * Container for all database repository instances.
 *
 * @remarks
 * Provides a unified interface to access all repository types.
 * All repositories implement standard interfaces for consistency across adapters.
 *
 * @example
 * ```ts
 * const db: DatabaseRepositories = getDatabase();
 *
 * // Platform operations
 * await db.platform.createPlatform({ name: 'web', description: 'Web app' });
 * const platform = await db.platform.getPlatform('web');
 *
 * // Environment operations
 * await db.environment.createEnvironment({ platform: 'web', environment: 'production' });
 *
 * // Configuration operations
 * await db.config.createVersion({
 *   platform: 'web',
 *   environment: 'production',
 *   config: { apiUrl: 'https://api.example.com' },
 *   isStable: true,
 * });
 *
 * // Usage tracking operations (atomic increments)
 * await db.usage.incrementApiRequests('tenant-subdomain');
 *
 * // For feature flags, use the three-tier repositories:
 * const threeTier = getThreeTierRepositories();
 * await threeTier.flag.create({...});
 * ```
 */
export interface DatabaseRepositories {
  platform: IPlatformRepository;
  environment: IEnvironmentRepository;
  config: IConfigRepository;
  usage: IUsageRepository;
}

/**
 * Container for three-tier architecture repositories.
 *
 * @remarks
 * These repositories implement the new three-tier model:
 * - Tier 1: Remote Configs (uses existing config repository)
 * - Tier 2: Feature Flags (new 2-value model with targeting)
 * - Tier 3: Experiments (multi-variant A/B testing)
 *
 * @example
 * ```ts
 * const threeTier = getThreeTierRepositories();
 *
 * // Feature Flags (2 values, country/language targeting)
 * await threeTier.flag.create({
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
 * // Experiments (multi-variant)
 * await threeTier.experiment.create({
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
 * await threeTier.stats.incrementFlagEvaluation('web', 'production', 'dark-mode', 'A', 'user-123');
 * ```
 */
export interface ThreeTierRepositories {
  flag: IFlagRepository;
  experiment: IExperimentRepository;
  stats: IStatsRepository;
}

/**
 * Creates database repository instances based on configuration.
 *
 * @param config - Database configuration with type and connection details
 * @returns Database repositories container with all repository instances
 *
 * @throws {Error} If database type is not supported
 * @throws {Error} If required configuration is missing (connection URL, etc.)
 * @throws {Error} If adapter initialization fails
 *
 * @remarks
 * **Factory Pattern:**
 * This function implements the Factory pattern, creating the appropriate adapter
 * based on the database type specified in the configuration.
 *
 * **Adapter Selection:**
 * - **Prisma adapter**: MySQL, PostgreSQL, SQLite
 * - **Mongoose adapter**: MongoDB
 * - **DynamoDB adapter**: AWS DynamoDB (custom implementation)
 * - **D1 adapter**: Cloudflare D1 (edge SQLite)
 *
 * **Runtime Database Selection:**
 * Database type is determined by `DB_TYPE` environment variable.
 * No code changes needed to switch databases - just update env vars.
 *
 * **Adapter Isolation:**
 * Each adapter is loaded dynamically via `require()` to avoid bundling
 * unused dependencies. For example, if using DynamoDB, Prisma/Mongoose
 * aren't loaded.
 *
 * @example
 * ```ts
 * // MySQL via Prisma
 * const mysqlConfig: DatabaseConfig = {
 *   type: 'mysql',
 *   mysqlUrl: 'mysql://user:pass@localhost:3306/togglebox',
 * };
 * const mysqlDb = createDatabaseRepositories(mysqlConfig);
 *
 * // PostgreSQL via Prisma (works with Supabase)
 * const pgConfig: DatabaseConfig = {
 *   type: 'postgresql',
 *   postgresUrl: 'postgresql://user:pass@db.supabase.co:5432/postgres',
 * };
 * const pgDb = createDatabaseRepositories(pgConfig);
 *
 * // MongoDB via Mongoose
 * const mongoConfig: DatabaseConfig = {
 *   type: 'mongodb',
 *   mongoUrl: 'mongodb://localhost:27017/togglebox',
 * };
 * const mongoDb = createDatabaseRepositories(mongoConfig);
 *
 * // DynamoDB for AWS Lambda
 * const dynamoConfig: DatabaseConfig = {
 *   type: 'dynamodb',
 *   dynamodb: {
 *     tableName: 'configurations',
 *     region: 'us-east-1',
 *     endpoint: 'http://localhost:8000', // Local DynamoDB for dev
 *   },
 * };
 * const dynamoDb = createDatabaseRepositories(dynamoConfig);
 *
 * // Cloudflare D1 for Workers
 * const d1Config: DatabaseConfig = {
 *   type: 'd1',
 *   d1Database: env.DB, // From Cloudflare Workers env binding
 * };
 * const d1Db = createDatabaseRepositories(d1Config);
 *
 * // All databases have identical interface
 * const platform = await mysqlDb.platform.getPlatform('web');
 * const platform2 = await mongoDb.platform.getPlatform('web');
 * const platform3 = await dynamoDb.platform.getPlatform('web');
 * // Same method signature, different underlying implementation
 * ```
 */
export function createDatabaseRepositories(config: DatabaseConfig): DatabaseRepositories {
  switch (config.type) {
    case 'mysql':
    case 'postgresql':
    case 'sqlite':
      // Prisma adapter handles MySQL, PostgreSQL, and SQLite
      return createPrismaRepositories(config);

    case 'mongodb':
      // Mongoose adapter handles MongoDB
      return createMongooseRepositories(config);

    case 'dynamodb':
      return createDynamoDBRepositories(config);

    case 'd1':
      // Cloudflare D1 adapter
      return createD1Repositories(config);

    default:
      throw new Error(`Unsupported database type: ${(config as { type: unknown }).type}`);
  }
}

/**
 * Creates Prisma-based repository instances.
 *
 * @param config - Database configuration for MySQL, PostgreSQL, or SQLite
 * @returns Prisma repository instances
 *
 * @throws {Error} If connection URL is missing or invalid
 * @throws {Error} If Prisma initialization fails
 *
 * @remarks
 * **Prisma Adapter:**
 * Prisma provides type-safe database access with auto-completion and migrations.
 * Single adapter handles three SQL dialects (MySQL, PostgreSQL, SQLite).
 *
 * **Connection URLs:**
 * - MySQL: `mysql://user:password@host:3306/database`
 * - PostgreSQL: `postgresql://user:password@host:5432/database`
 * - SQLite: `file:./data/config.db` (relative or absolute path)
 *
 * **Supabase Support:**
 * PostgreSQL adapter works seamlessly with Supabase:
 * `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
 *
 * **Connection Pooling:**
 * Prisma manages connection pooling automatically.
 * Default pool size: 10 connections (configurable via Prisma schema).
 *
 * **SQLite Optimization:**
 * When using SQLite, optimized settings are applied (WAL mode, etc.).
 *
 * @example
 * ```ts
 * // MySQL with connection pooling
 * const mysqlConfig: DatabaseConfig = {
 *   type: 'mysql',
 *   mysqlUrl: 'mysql://root:password@localhost:3306/togglebox?connection_limit=20',
 * };
 * const db = createPrismaRepositories(mysqlConfig);
 *
 * // PostgreSQL on Supabase
 * const supabaseConfig: DatabaseConfig = {
 *   type: 'postgresql',
 *   postgresUrl: 'postgresql://postgres:secret@db.abc123.supabase.co:5432/postgres',
 * };
 * const supabaseDb = createPrismaRepositories(supabaseConfig);
 *
 * // SQLite for local development
 * const sqliteConfig: DatabaseConfig = {
 *   type: 'sqlite',
 *   sqliteFile: './dev.db',
 * };
 * const devDb = createPrismaRepositories(sqliteConfig);
 * ```
 */
function createPrismaRepositories(config: DatabaseConfig): DatabaseRepositories {
  const { createPrismaRepositories: prismaFactory } = require('./adapters/prisma');

  let connectionUrl: string;
  let isSQLite = false;

  switch (config.type) {
    case 'mysql':
      if (!config.mysqlUrl) {
        throw new Error('MySQL connection URL is required');
      }
      connectionUrl = config.mysqlUrl;
      break;

    case 'postgresql':
      if (!config.postgresUrl) {
        throw new Error('PostgreSQL connection URL is required');
      }
      connectionUrl = config.postgresUrl;
      break;

    case 'sqlite':
      if (!config.sqliteFile) {
        throw new Error('SQLite file path is required');
      }
      connectionUrl = `file:${config.sqliteFile}`;
      isSQLite = true;
      break;

    default:
      throw new Error(`Invalid database type for Prisma: ${config.type}`);
  }

  return prismaFactory(connectionUrl, isSQLite);
}

/**
 * Creates Mongoose-based repository instances.
 *
 * @param config - Database configuration for MongoDB
 * @returns Mongoose repository instances
 *
 * @throws {Error} If MongoDB connection URL is missing
 * @throws {Error} If Mongoose connection fails
 *
 * @remarks
 * **Mongoose Adapter:**
 * Mongoose provides MongoDB object modeling with schema validation.
 * Well-suited for document-based storage with flexible schemas.
 *
 * **Connection URL:**
 * Standard MongoDB connection string with options:
 * `mongodb://user:password@host:27017/database?options`
 *
 * **MongoDB Atlas Support:**
 * Works seamlessly with MongoDB Atlas (managed cloud MongoDB):
 * `mongodb+srv://user:password@cluster.mongodb.net/database`
 *
 * **Connection Pooling:**
 * Mongoose manages connection pooling automatically.
 * Default pool size: 5 connections (configurable in connection options).
 *
 * **Schema Flexibility:**
 * MongoDB is schema-less, but Mongoose provides schema validation
 * at the application level for data consistency.
 *
 * @example
 * ```ts
 * // Local MongoDB
 * const localConfig: DatabaseConfig = {
 *   type: 'mongodb',
 *   mongoUrl: 'mongodb://localhost:27017/togglebox',
 * };
 * const localDb = createMongooseRepositories(localConfig);
 *
 * // MongoDB Atlas (cloud)
 * const atlasConfig: DatabaseConfig = {
 *   type: 'mongodb',
 *   mongoUrl: 'mongodb+srv://admin:secret@cluster0.mongodb.net/togglebox?retryWrites=true&w=majority',
 * };
 * const atlasDb = createMongooseRepositories(atlasConfig);
 *
 * // With authentication and replica set
 * const replicaConfig: DatabaseConfig = {
 *   type: 'mongodb',
 *   mongoUrl: 'mongodb://user:pass@host1:27017,host2:27017,host3:27017/togglebox?replicaSet=rs0',
 * };
 * const replicaDb = createMongooseRepositories(replicaConfig);
 * ```
 */
function createMongooseRepositories(config: DatabaseConfig): DatabaseRepositories {
  const { createMongooseRepositories: mongooseFactory } = require('./adapters/mongoose');

  if (!config.mongoUrl) {
    throw new Error('MongoDB connection URL is required');
  }

  return mongooseFactory(config.mongoUrl);
}

/**
 * Creates DynamoDB-based repository instances.
 *
 * @param _config - Database configuration (DynamoDB config from environment variables)
 * @returns DynamoDB repository instances
 *
 * @throws {Error} If DynamoDB configuration is invalid
 * @throws {Error} If DynamoDB connection fails
 *
 * @remarks
 * **DynamoDB Adapter:**
 * Custom implementation using AWS SDK with single-table design pattern.
 * Optimized for serverless environments (AWS Lambda).
 *
 * **Configuration:**
 * DynamoDB configuration is read from environment variables:
 * - `DYNAMODB_TABLE` - Table name (e.g., "configurations")
 * - `AWS_REGION` - AWS region (e.g., "us-east-1")
 * - `DYNAMODB_ENDPOINT` - Optional local endpoint (e.g., "http://localhost:8000")
 *
 * **Single-Table Design:**
 * All entities stored in one table using composite keys (PK/SK pattern).
 * Reduces costs and improves performance in serverless environments.
 *
 * **No Connection Pooling:**
 * DynamoDB is a managed service - no connections to manage.
 * Each request uses AWS SDK with automatic retry and throttling.
 *
 * **Local Development:**
 * Use DynamoDB Local via Docker:
 * `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * @example
 * ```ts
 * // Production DynamoDB
 * process.env.DYNAMODB_TABLE = 'configurations';
 * process.env.AWS_REGION = 'us-east-1';
 *
 * const dynamoConfig: DatabaseConfig = { type: 'dynamodb' };
 * const prodDb = createDynamoDBRepositories(dynamoConfig);
 *
 * // Local DynamoDB for development
 * process.env.DYNAMODB_TABLE = 'configurations-dev';
 * process.env.AWS_REGION = 'us-east-1';
 * process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
 *
 * const localDb = createDynamoDBRepositories(dynamoConfig);
 *
 * // Both use same interface
 * await prodDb.platform.createPlatform({ name: 'web', description: '...' });
 * await localDb.platform.createPlatform({ name: 'web', description: '...' });
 * ```
 */
function createDynamoDBRepositories(_config: DatabaseConfig): DatabaseRepositories {
  const { createDynamoDBRepositories: dynamoFactory } = require('./adapters/dynamodb');

  // Note: DynamoDB configuration is handled by the existing database.ts module
  // which reads from DYNAMODB_TABLE, AWS_REGION environment variables.
  // We could optionally override these here if needed.

  return dynamoFactory();
}

/**
 * Creates Cloudflare D1-based repository instances.
 *
 * @param config - Database configuration with D1 database binding
 * @returns D1 repository instances
 *
 * @throws {Error} If D1 database binding is missing
 * @throws {Error} If D1 initialization fails
 *
 * @remarks
 * **Cloudflare D1 Adapter:**
 * D1 is Cloudflare's edge-native SQLite database.
 * Runs on Cloudflare Workers with global distribution.
 *
 * **Database Binding:**
 * D1 database is provided via Cloudflare Workers environment binding.
 * Cannot be initialized from connection URL - requires runtime binding.
 *
 * **Wrangler Configuration:**
 * Configure D1 binding in `wrangler.toml`:
 * ```toml
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "togglebox-db"
 * database_id = "abc123..."
 * ```
 *
 * **Edge Distribution:**
 * Data is automatically replicated to Cloudflare edge locations.
 * Provides low-latency access globally.
 *
 * **SQLite Compatibility:**
 * D1 uses SQLite dialect - same schema as Prisma SQLite adapter.
 *
 * @example
 * ```ts
 * // In Cloudflare Worker
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     // D1 binding from environment
 *     const d1Config: DatabaseConfig = {
 *       type: 'd1',
 *       d1Database: env.DB, // DB binding from wrangler.toml
 *     };
 *
 *     const db = createD1Repositories(d1Config);
 *
 *     // Use repositories at the edge
 *     const platform = await db.platform.getPlatform('web');
 *     const config = await db.config.getLatestVersion('web', 'production');
 *
 *     return new Response(JSON.stringify({ platform, config }));
 *   },
 * };
 *
 * // Local development with wrangler dev
 * // D1 binding is automatically provided by Wrangler
 * ```
 */
function createD1Repositories(config: DatabaseConfig): DatabaseRepositories {
  const { createD1Repositories: d1Factory } = require('./adapters/d1');

  if (config.type !== 'd1') {
    throw new Error(`Invalid database type for D1: ${config.type}`);
  }

  if (!config.d1Database) {
    throw new Error('D1 database binding is required');
  }

  return d1Factory({ type: 'd1', database: config.d1Database });
}

/**
 * Singleton instance for database repositories.
 *
 * @remarks
 * **Singleton Pattern:**
 * Maintains a single database connection throughout application lifecycle.
 * Improves performance by reusing connections and connection pooling.
 *
 * **Lazy Initialization:**
 * Instance is created on first call to `getDatabase()`, not at module load.
 * Prevents unnecessary database connections if not used.
 *
 * **Testing:**
 * Call `resetDatabase()` between tests to reset the singleton.
 * Ensures clean state for each test case.
 */
let databaseInstance: DatabaseRepositories | null = null;

/**
 * Gets or creates the database repositories singleton.
 *
 * @param config - Optional database configuration (uses loadDatabaseConfig() if not provided)
 * @returns Database repositories singleton instance
 *
 * @throws {Error} If database configuration is invalid
 * @throws {Error} If database type is not supported
 * @throws {Error} If adapter initialization fails
 *
 * @remarks
 * **Singleton Pattern:**
 * This function creates a singleton instance on first call and returns
 * the same instance on subsequent calls. Ensures only one database connection
 * pool exists throughout the application lifecycle.
 *
 * **Automatic Configuration:**
 * If no config is provided, loads configuration from environment variables
 * via `loadDatabaseConfig()`. Typical usage doesn't require passing config.
 *
 * **Connection Pooling:**
 * Single instance enables connection pooling for databases that support it
 * (MySQL, PostgreSQL, MongoDB). Improves performance and resource usage.
 *
 * **Lazy Initialization:**
 * Database connection is not established until first call.
 * Prevents unnecessary connections in environments where DB isn't needed.
 *
 * @example
 * ```ts
 * // First call - creates instance from environment variables
 * const db = getDatabase();
 * await db.platform.createPlatform({ name: 'web', description: 'Web app' });
 *
 * // Subsequent calls - returns same instance
 * const db2 = getDatabase();
 * console.log(db === db2); // true
 *
 * // Works across different files (singleton)
 * // file1.ts
 * import { getDatabase } from './factory';
 * const db1 = getDatabase();
 *
 * // file2.ts
 * import { getDatabase } from './factory';
 * const db2 = getDatabase();
 *
 * console.log(db1 === db2); // true - same instance
 *
 * // Override with custom config (first call only)
 * const customConfig: DatabaseConfig = {
 *   type: 'sqlite',
 *   sqliteFile: './test.db',
 * };
 * const testDb = getDatabase(customConfig);
 *
 * // Switching databases at runtime (requires resetDatabase() first)
 * resetDatabase();
 * const mysqlConfig: DatabaseConfig = {
 *   type: 'mysql',
 *   mysqlUrl: 'mysql://localhost:3306/togglebox',
 * };
 * const mysqlDb = getDatabase(mysqlConfig);
 * ```
 */
export function getDatabase(config?: DatabaseConfig): DatabaseRepositories {
  if (!databaseInstance) {
    const dbConfig = config || require('./config').loadDatabaseConfig();
    databaseInstance = createDatabaseRepositories(dbConfig);
  }
  return databaseInstance;
}

/**
 * Resets the database singleton instance.
 *
 * @remarks
 * **Testing Use Case:**
 * Used in test suites to reset the database connection between tests.
 * Ensures each test starts with a clean database state.
 *
 * **Production Warning:**
 * Should NOT be used in production code. Resetting the singleton
 * destroys connection pooling benefits and may cause connection leaks.
 *
 * **Connection Cleanup:**
 * This function only resets the singleton reference. It does not
 * explicitly close database connections. Most adapters handle cleanup
 * automatically via garbage collection, but for production use cases,
 * implement proper shutdown handlers.
 *
 * @example
 * ```ts
 * // In test suite (Jest, Mocha, etc.)
 * beforeEach(() => {
 *   resetDatabase(); // Clear singleton before each test
 * });
 *
 * test('creates platform', async () => {
 *   const db = getDatabase(); // Fresh instance for this test
 *   const platform = await db.platform.createPlatform({
 *     name: 'web',
 *     description: 'Test platform',
 *   });
 *   expect(platform.name).toBe('web');
 * });
 *
 * test('creates environment', async () => {
 *   const db = getDatabase(); // Fresh instance (resetDatabase was called)
 *   const env = await db.environment.createEnvironment({
 *     platform: 'web',
 *     environment: 'production',
 *   });
 *   expect(env.environment).toBe('production');
 * });
 *
 * // Switch databases during runtime (not recommended for production)
 * const db1 = getDatabase(); // Uses default config
 * resetDatabase();
 * const db2 = getDatabase({
 *   type: 'sqlite',
 *   sqliteFile: './test.db',
 * }); // Now uses SQLite
 * ```
 */
export function resetDatabase(): void {
  databaseInstance = null;
}

/**
 * Singleton instance for three-tier repositories.
 */
let threeTierInstance: ThreeTierRepositories | null = null;

/**
 * Creates three-tier repository instances based on configuration.
 *
 * @param config - Database configuration with type and connection details
 * @returns Three-tier repositories for the specified database
 *
 * @throws {Error} If database type is not supported
 *
 * @remarks
 * **ALL databases now support the complete three-tier architecture:**
 * - ✅ Tier 1: Remote Configs (Platform, Environment, Config repositories)
 * - ✅ Tier 2: Feature Flags (2-value model with targeting)
 * - ✅ Tier 3: Experiments (multi-variant A/B testing)
 * - ✅ Stats (metrics for all tiers)
 *
 * @example
 * ```ts
 * // Works with ANY database type
 * const threeTier = createThreeTierRepositories({ type: 'mysql', mysqlUrl: '...' });
 * await threeTier.flag.create({ ... });
 * await threeTier.experiment.create({ ... });
 * await threeTier.stats.incrementFlagEvaluation('web', 'prod', 'dark-mode', 'A', 'user-123');
 * ```
 */
export function createThreeTierRepositories(config: DatabaseConfig): ThreeTierRepositories {
  switch (config.type) {
    case 'dynamodb':
      return createDynamoDBThreeTierRepos();

    case 'mysql':
    case 'postgresql':
    case 'sqlite':
      return createPrismaThreeTierRepos(config);

    case 'mongodb':
      return createMongooseThreeTierRepos(config);

    case 'd1':
      return createD1ThreeTierRepos(config);

    default:
      throw new Error(`Unsupported database type: ${(config as { type: unknown }).type}`);
  }
}

/**
 * Creates DynamoDB three-tier repositories.
 */
function createDynamoDBThreeTierRepos(): ThreeTierRepositories {
  const { createDynamoDBThreeTierRepositories } = require('./adapters/dynamodb');
  return createDynamoDBThreeTierRepositories();
}

/**
 * Creates Prisma three-tier repositories for MySQL, PostgreSQL, and SQLite.
 */
function createPrismaThreeTierRepos(config: DatabaseConfig): ThreeTierRepositories {
  const { createPrismaThreeTierRepositories } = require('./adapters/prisma');

  let connectionUrl: string;
  let isSQLite = false;

  switch (config.type) {
    case 'mysql':
      if (!config.mysqlUrl) {
        throw new Error('MySQL connection URL is required');
      }
      connectionUrl = config.mysqlUrl;
      break;

    case 'postgresql':
      if (!config.postgresUrl) {
        throw new Error('PostgreSQL connection URL is required');
      }
      connectionUrl = config.postgresUrl;
      break;

    case 'sqlite':
      if (!config.sqliteFile) {
        throw new Error('SQLite file path is required');
      }
      connectionUrl = `file:${config.sqliteFile}`;
      isSQLite = true;
      break;

    default:
      throw new Error(`Invalid database type for Prisma three-tier: ${config.type}`);
  }

  return createPrismaThreeTierRepositories(connectionUrl, isSQLite);
}

/**
 * Creates Mongoose three-tier repositories for MongoDB.
 */
function createMongooseThreeTierRepos(config: DatabaseConfig): ThreeTierRepositories {
  const { createMongooseThreeTierRepositories } = require('./adapters/mongoose');

  if (!config.mongoUrl) {
    throw new Error('MongoDB connection URL is required');
  }

  return createMongooseThreeTierRepositories(config.mongoUrl);
}

/**
 * Creates Cloudflare D1 three-tier repositories.
 */
function createD1ThreeTierRepos(config: DatabaseConfig): ThreeTierRepositories {
  const { createD1ThreeTierRepositories } = require('./adapters/d1');

  if (config.type !== 'd1') {
    throw new Error(`Invalid database type for D1 three-tier: ${config.type}`);
  }

  if (!config.d1Database) {
    throw new Error('D1 database binding is required');
  }

  return createD1ThreeTierRepositories(config.d1Database);
}

/**
 * Gets or creates the three-tier repositories singleton.
 *
 * @param config - Optional database configuration
 * @returns Three-tier repositories singleton instance
 *
 * @remarks
 * Returns repositories for the new three-tier architecture:
 * - flag: Feature Flags (2-value model with targeting)
 * - experiment: Experiments (multi-variant A/B testing)
 * - stats: Statistics for all tiers
 *
 * @example
 * ```ts
 * const threeTier = getThreeTierRepositories();
 *
 * // Create a feature flag
 * const flag = await threeTier.flag.create({...});
 *
 * // Create an experiment
 * const exp = await threeTier.experiment.create({...});
 *
 * // Track stats
 * await threeTier.stats.incrementFlagEvaluation(...);
 * ```
 */
export function getThreeTierRepositories(config?: DatabaseConfig): ThreeTierRepositories {
  if (!threeTierInstance) {
    const dbConfig = config || require('./config').loadDatabaseConfig();
    threeTierInstance = createThreeTierRepositories(dbConfig);
  }
  return threeTierInstance;
}

/**
 * Resets the three-tier repositories singleton.
 */
export function resetThreeTierRepositories(): void {
  threeTierInstance = null;
}
