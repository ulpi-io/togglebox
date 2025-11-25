/**
 * Mongoose adapter module for MongoDB database operations.
 *
 * @module mongoose
 *
 * @remarks
 * Provides Mongoose repository implementations using Mongoose ODM for MongoDB.
 * Supports connection pooling with lazy initialization.
 *
 * **Architecture:**
 * - Full ODM implementations with Mongoose models
 * - Connection pooling with configurable pool size
 * - Offset-based pagination (skip/limit)
 * - JSON string serialization for complex fields
 * - Compound indexes for efficient queries
 *
 * **Key Features:**
 * - Lazy connection (connects on first database operation)
 * - Singleton connection promise (reuses existing connection)
 * - Type-safe documents via Mongoose schemas
 * - Connection pool tuning via environment variables
 *
 * **Connection Pool:**
 * - Configured via environment variables:
 *   - DATABASE_MAX_POOL_SIZE (default: 10)
 *   - DATABASE_MIN_POOL_SIZE (default: 2)
 *   - DATABASE_MAX_IDLE_TIME_MS (default: 60000)
 *
 * @example
 * ```ts
 * import { createMongooseRepositories } from './adapters/mongoose';
 *
 * const db = createMongooseRepositories('mongodb://localhost:27017/dbname');
 * const platform = await db.platform.createPlatform({ name: 'web', description: '...' });
 * ```
 */

import mongoose from 'mongoose';
import { DatabaseRepositories } from '../../factory';
import { MongoosePlatformRepository } from './MongoosePlatformRepository';
import { MongooseEnvironmentRepository } from './MongooseEnvironmentRepository';
import { MongooseConfigRepository } from './MongooseConfigRepository';
import { MongooseFeatureFlagRepository } from './MongooseFeatureFlagRepository';
import { MongooseUsageRepository } from './MongooseUsageRepository';
import { logger } from '@togglebox/shared';

export * from './MongoosePlatformRepository';
export * from './MongooseEnvironmentRepository';
export * from './MongooseConfigRepository';
export * from './MongooseFeatureFlagRepository';
export * from './MongooseUsageRepository';
export * from './schemas';

let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Ensures MongoDB connection is established with connection pooling.
 *
 * @param connectionUrl - MongoDB connection URL
 * @returns Promise that resolves when connection is established
 *
 * @remarks
 * Connection pool configuration:
 * - **maxPoolSize**: Maximum number of connections in pool (default: 10)
 * - **minPoolSize**: Minimum number of connections in pool (default: 2)
 * - **maxIdleTimeMS**: Max time a connection can be idle (default: 60000ms)
 * - **serverSelectionTimeoutMS**: Timeout for server selection (default: 30000ms)
 * - **socketTimeoutMS**: Socket timeout (default: 45000ms)
 *
 * Environment variables for connection pool tuning:
 * - `DATABASE_MAX_POOL_SIZE` - Max connections in pool (default: 10)
 * - `DATABASE_MIN_POOL_SIZE` - Min connections in pool (default: 2)
 * - `DATABASE_MAX_IDLE_TIME_MS` - Max idle time in milliseconds (default: 60000)
 *
 * Connection happens lazily on first database operation.
 *
 * @see https://mongoosejs.com/docs/connections.html#connection-pool
 */
function ensureConnection(connectionUrl: string): Promise<typeof mongoose> {
  if (!connectionPromise) {
    // Parse connection pool configuration from environment
    const maxPoolSize = parseInt(process.env['DATABASE_MAX_POOL_SIZE'] || '10', 10);
    const minPoolSize = parseInt(process.env['DATABASE_MIN_POOL_SIZE'] || '2', 10);
    const maxIdleTimeMS = parseInt(process.env['DATABASE_MAX_IDLE_TIME_MS'] || '60000', 10);

    const options = {
      // Connection pool configuration
      maxPoolSize,
      minPoolSize,
      maxIdleTimeMS,

      // Connection timeout settings
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds

      // Automatic retry on connection failure
      retryWrites: true,
      retryReads: true,
    };

    connectionPromise = mongoose.connect(connectionUrl, options);

    // Log connection pool events in development
    if (process.env['NODE_ENV'] === 'development') {
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connection pool established', {
          maxPoolSize,
          minPoolSize,
          maxIdleTimeMS,
        });
      });
    }
  }
  return connectionPromise;
}

/**
 * Creates Mongoose-based repository instances.
 *
 * @param connectionUrl - MongoDB connection URL
 * @returns Database repositories
 *
 * @remarks
 * Connection to MongoDB is established lazily on first database operation.
 */
export function createMongooseRepositories(connectionUrl: string): DatabaseRepositories {
  // Store the connection URL and ensure connection on first use
  ensureConnection(connectionUrl).catch((error) => {
    logger.error('Failed to connect to MongoDB', error);
  });

  return {
    platform: new MongoosePlatformRepository(),
    environment: new MongooseEnvironmentRepository(),
    config: new MongooseConfigRepository(),
    featureFlag: new MongooseFeatureFlagRepository(),
    usage: new MongooseUsageRepository(mongoose.connection),
  };
}

/**
 * Disconnects from MongoDB.
 * Used for cleanup in testing or shutdown scenarios.
 */
export function disconnectMongoose(): Promise<void> {
  if (connectionPromise) {
    connectionPromise = null;
    return mongoose.disconnect();
  }
  return Promise.resolve();
}
