/**
 * Prisma database adapter for authentication system.
 *
 * @module adapters/prisma
 *
 * @remarks
 * Provides Prisma ORM implementations of authentication repositories.
 *
 * **Supported Databases:**
 * - MySQL (5.7+, 8.0+)
 * - PostgreSQL (10+)
 * - SQLite (3.x)
 *
 * **Repository Implementations:**
 * - {@link PrismaUserRepository} - User management
 * - {@link PrismaApiKeyRepository} - API key management
 * - {@link PrismaPasswordResetRepository} - Password reset tokens
 *
 * **Configuration:**
 * Set `DATABASE_URL` environment variable with connection string:
 * ```
 * DATABASE_URL="mysql://user:pass@localhost:3306/dbname"
 * DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
 * DATABASE_URL="file:./dev.db"
 * ```
 *
 * **Schema Management:**
 * - Generate: `npm run schema:generate` (based on DB_TYPE env var)
 * - Migrate: `npx prisma migrate dev`
 * - Deploy: `npx prisma migrate deploy`
 *
 * @example
 * ```typescript
 * const repositories = createPrismaAuthRepositories();
 * const userService = new UserService(repositories.user);
 * ```
 */

import { PrismaUserRepository } from './PrismaUserRepository';
import { PrismaApiKeyRepository } from './PrismaApiKeyRepository';
import { PrismaPasswordResetRepository } from './PrismaPasswordResetRepository';
import { AuthRepositories } from '../dynamodb';

export * from './PrismaUserRepository';
export * from './PrismaApiKeyRepository';
export * from './PrismaPasswordResetRepository';
export * from './database';

/**
 * Create Prisma auth repository collection.
 *
 * @returns Object containing all auth repositories
 *
 * @remarks
 * **Factory Function:**
 * Creates instances of all Prisma repository implementations.
 * All repositories share the same Prisma client instance.
 *
 * **Database Support:**
 * Works with MySQL, PostgreSQL, and SQLite without code changes.
 * Database type determined by `DATABASE_URL` connection string.
 *
 * **Connection Management:**
 * Prisma client connects lazily on first query.
 * Use `connectPrisma()` to verify connection at startup.
 *
 * @example
 * ```typescript
 * // Create repositories
 * const repos = createPrismaAuthRepositories();
 *
 * // Inject into services
 * const userService = new UserService(repos.user);
 * const apiKeyService = new ApiKeyService(repos.apiKey, repos.user);
 * const resetService = new PasswordResetService(
 *   repos.user,
 *   repos.passwordReset,
 *   emailService
 * );
 * ```
 */
export function createPrismaAuthRepositories(): AuthRepositories {
  return {
    user: new PrismaUserRepository(),
    apiKey: new PrismaApiKeyRepository(),
    passwordReset: new PrismaPasswordResetRepository(),
  };
}
