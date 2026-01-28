/**
 * MongoDB database adapter for authentication system.
 *
 * @module adapters/mongodb
 *
 * @remarks
 * **Document-Based Storage:**
 * Uses MongoDB with Mongoose ODM for schema validation and ORM features.
 * Each entity (users, API keys, password reset tokens) stored in separate collections.
 *
 * **Mongoose ODM Benefits:**
 * - Schema validation and type safety
 * - Automatic ID generation (ObjectId)
 * - Built-in timestamps (createdAt, updatedAt)
 * - Index management via schema definitions
 * - Middleware hooks for complex logic
 *
 * **Collections:**
 * - `users` - User accounts with email uniqueness
 * - `apikeys` - API keys with hash index
 * - `passwordresettokens` - Password reset tokens with expiration
 *
 * **Configuration:**
 * Set `MONGODB_URI` environment variable:
 * ```
 * MONGODB_URI=mongodb://localhost:27017/togglebox-auth
 * MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/auth
 * ```
 *
 * **Connection:**
 * Call `connectMongoDB()` before using repositories.
 * Connection managed automatically via Mongoose singleton.
 *
 * @example
 * ```typescript
 * import { createMongoDBAuthRepositories, connectMongoDB } from '@togglebox/auth/adapters/mongodb';
 *
 * await connectMongoDB();
 * const repos = createMongoDBAuthRepositories();
 * const user = await repos.user.findByEmail('user@example.com');
 * ```
 */

import { MongoDBUserRepository } from "./MongoDBUserRepository";
import { MongoDBApiKeyRepository } from "./MongoDBApiKeyRepository";
import { MongoDBPasswordResetRepository } from "./MongoDBPasswordResetRepository";
import { AuthRepositories } from "../dynamodb";

export * from "./MongoDBUserRepository";
export * from "./MongoDBApiKeyRepository";
export * from "./MongoDBPasswordResetRepository";
export * from "./database";
export * from "./schemas";

/**
 * Create MongoDB authentication repositories.
 *
 * @returns Repository collection for users, API keys, and password resets
 *
 * @remarks
 * **Separate Collections:**
 * Unlike DynamoDB single-table design, MongoDB uses separate collections:
 * - `users` - User documents
 * - `apikeys` - API key documents
 * - `passwordresettokens` - Password reset token documents
 *
 * **Connection Required:**
 * Ensure `connectMongoDB()` called before using repositories.
 * Mongoose will queue operations until connected.
 *
 * **Schema Validation:**
 * All operations validated against Mongoose schemas.
 * Invalid data throws validation errors before database write.
 *
 * @example
 * ```typescript
 * import { connectMongoDB, createMongoDBAuthRepositories } from '@togglebox/auth/adapters/mongodb';
 *
 * // Connect once at app startup
 * await connectMongoDB();
 *
 * // Create repositories
 * const repos = createMongoDBAuthRepositories();
 *
 * // Use in services
 * const userService = new UserService(repos.user);
 * ```
 */
export function createMongoDBAuthRepositories(): AuthRepositories {
  return {
    user: new MongoDBUserRepository(),
    apiKey: new MongoDBApiKeyRepository(),
    passwordReset: new MongoDBPasswordResetRepository(),
  };
}
