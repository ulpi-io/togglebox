/**
 * Prisma database client and connection management.
 *
 * @module adapters/prisma/database
 *
 * @remarks
 * Provides shared Prisma client instance and connection lifecycle methods.
 *
 * **Supported Databases:**
 * - MySQL
 * - PostgreSQL
 * - SQLite
 *
 * **Configuration:**
 * Database URL configured via `DATABASE_URL` environment variable.
 * Schema generated based on `DB_TYPE` (mysql, postgresql, sqlite).
 *
 * **Logging:**
 * - Development: Logs queries, errors, and warnings
 * - Production: Logs errors only
 */

import { PrismaClient } from ".prisma/client-auth";

/**
 * Shared Prisma client instance.
 *
 * @remarks
 * **Singleton Pattern:**
 * All Prisma repositories share this client instance.
 * Ensures efficient connection pooling.
 *
 * **Logging Configuration:**
 * - Development: ['query', 'error', 'warn']
 * - Production: ['error']
 *
 * **Connection Pooling:**
 * Prisma automatically manages connection pooling based on database type.
 */
export const prisma = new PrismaClient({
  log:
    process.env["NODE_ENV"] === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

/**
 * Disconnect Prisma client on application shutdown.
 *
 * @remarks
 * **Usage:**
 * Call this function in graceful shutdown handlers:
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await disconnectPrisma();
 *   process.exit(0);
 * });
 * ```
 *
 * **Effect:**
 * Closes all database connections gracefully.
 * Prevents connection leaks and database locks.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Explicitly connect to database.
 *
 * @remarks
 * **Optional:**
 * Prisma connects automatically on first query (lazy connection).
 * This function is useful for:
 * - Verifying connection at application startup
 * - Warming up connection pool
 * - Catching connection errors early
 *
 * @example
 * ```typescript
 * try {
 *   await connectPrisma();
 *   console.log('Database connected');
 * } catch (error) {
 *   console.error('Database connection failed', error);
 *   process.exit(1);
 * }
 * ```
 */
export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}
