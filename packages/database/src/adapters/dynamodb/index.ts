/**
 * DynamoDB adapter module for database operations.
 *
 * @module dynamodb
 *
 * @remarks
 * Provides DynamoDB repository implementations using AWS SDK with single-table design.
 * Optimized for serverless environments (AWS Lambda) with token-based pagination.
 *
 * **Architecture:**
 * - Single-table design with composite keys (PK/SK pattern)
 * - Sparse indexes for efficient stable version queries
 * - Token-based pagination (native DynamoDB)
 * - No connection pooling (serverless, managed service)
 *
 * **Key Features:**
 * - Consistent performance at any scale
 * - Pay-per-request pricing (no idle costs)
 * - Global tables for multi-region deployments
 * - Built-in encryption at rest
 *
 * @example
 * ```ts
 * import { createDynamoDBRepositories } from './adapters/dynamodb';
 *
 * const db = createDynamoDBRepositories();
 * const platform = await db.platform.createPlatform({ name: 'web', description: '...' });
 * ```
 */

import { DatabaseRepositories } from '../../factory';
import { DynamoDBPlatformRepository } from './DynamoDBPlatformRepository';
import { DynamoDBEnvironmentRepository } from './DynamoDBEnvironmentRepository';
import { DynamoDBConfigRepository } from './DynamoDBConfigRepository';
import { DynamoDBFeatureFlagRepository } from './DynamoDBFeatureFlagRepository';
import { DynamoDBUsageRepository } from './DynamoDBUsageRepository';

export * from './DynamoDBPlatformRepository';
export * from './DynamoDBEnvironmentRepository';
export * from './DynamoDBConfigRepository';
export * from './DynamoDBFeatureFlagRepository';
export * from './DynamoDBUsageRepository';

/**
 * Creates DynamoDB repository instances.
 *
 * @returns Database repositories for DynamoDB adapter
 *
 * @remarks
 * Configuration is read from environment variables via `database.ts`:
 * - `DYNAMODB_TABLE` - Table name (matches AWS SDK conventions)
 * - `AWS_REGION` - AWS region (matches AWS SDK conventions)
 * - `DYNAMODB_ENDPOINT` - Optional local endpoint for development
 */
export function createDynamoDBRepositories(): DatabaseRepositories {
  return {
    platform: new DynamoDBPlatformRepository(),
    environment: new DynamoDBEnvironmentRepository(),
    config: new DynamoDBConfigRepository(),
    featureFlag: new DynamoDBFeatureFlagRepository(),
    usage: new DynamoDBUsageRepository(),
  };
}
