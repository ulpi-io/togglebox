/**
 * DynamoDB database adapter for authentication system.
 *
 * @module adapters/dynamodb
 *
 * @remarks
 * **Single-Table Design:**
 * All auth entities (users, API keys, password reset tokens) stored in one DynamoDB table
 * using PK/SK partition patterns for efficient access.
 *
 * **Access Patterns:**
 * - Users: By ID, by email (GSI1)
 * - API Keys: By ID, by hash (GSI2), by user (GSI1)
 * - Reset Tokens: By ID, by hash (GSI2), by user (GSI1)
 *
 * **Multi-Tenancy:**
 * Uses `getAuthTableName()` from @togglebox/database for tenant-aware table names.
 * All operations automatically scoped to tenant context via AsyncLocalStorage.
 *
 * **Configuration:**
 * Set environment variables:
 * ```
 * DYNAMODB_TABLE=configurations
 * AWS_REGION=us-east-1
 * DYNAMODB_ENDPOINT=http://localhost:8000  # For local development
 * ```
 *
 * **Index Configuration Required:**
 * - GSI1: GSI1PK (Hash), GSI1SK (Range) - For user-based queries
 * - GSI2: GSI2PK (Hash), GSI2SK (Range) - For hash-based lookups
 *
 * @example
 * ```typescript
 * import { createDynamoDBAuthRepositories } from '@togglebox/auth/adapters/dynamodb';
 *
 * const repos = createDynamoDBAuthRepositories();
 * const user = await repos.user.findByEmail('user@example.com');
 * ```
 */

import { DynamoDBUserRepository } from "./DynamoDBUserRepository";
import { DynamoDBApiKeyRepository } from "./DynamoDBApiKeyRepository";
import { DynamoDBPasswordResetRepository } from "./DynamoDBPasswordResetRepository";
import {
  IUserRepository,
  IApiKeyRepository,
  IPasswordResetRepository,
} from "../../interfaces";

export * from "./DynamoDBUserRepository";
export * from "./DynamoDBApiKeyRepository";
export * from "./DynamoDBPasswordResetRepository";

/**
 * Collection of authentication repositories.
 *
 * @remarks
 * Standard interface returned by all database adapters.
 * Enables dependency injection and testability.
 */
export interface AuthRepositories {
  user: IUserRepository;
  apiKey: IApiKeyRepository;
  passwordReset: IPasswordResetRepository;
}

/**
 * Create DynamoDB authentication repositories.
 *
 * @returns Repository collection for users, API keys, and password resets
 *
 * @remarks
 * **Single-Table Design:**
 * All repositories share the same DynamoDB table with different PK/SK patterns:
 * - Users: `PK: USER#<id>`, `SK: USER#<id>`
 * - API Keys: `PK: APIKEY#<id>`, `SK: APIKEY#<id>`
 * - Reset Tokens: `PK: RESET#<id>`, `SK: RESET#<id>`
 *
 * **No Connection Pooling:**
 * DynamoDB is serverless - each request uses AWS SDK directly.
 *
 * @example
 * ```typescript
 * const repos = createDynamoDBAuthRepositories();
 *
 * // Use in services
 * const userService = new UserService(repos.user);
 * const apiKeyService = new ApiKeyService(repos.apiKey, repos.user);
 * ```
 */
export function createDynamoDBAuthRepositories(): AuthRepositories {
  return {
    user: new DynamoDBUserRepository(),
    apiKey: new DynamoDBApiKeyRepository(),
    passwordReset: new DynamoDBPasswordResetRepository(),
  };
}
