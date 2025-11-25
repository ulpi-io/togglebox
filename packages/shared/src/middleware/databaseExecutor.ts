import { Request } from 'express';
import { RequestWithDatabaseContext } from './databaseContext';

/**
 * Executes a database operation with the correct table prefix from request context.
 *
 * This function automatically:
 * 1. Creates an AsyncLocalStorage context with the table prefix from req.dbConfig
 * 2. Executes the database operation within that context
 * 3. Automatically cleans up the context after operation completes
 *
 * @param req - Express request with database context
 * @param operation - Async function that performs database operations
 * @returns Result of the database operation
 *
 * @remarks
 * **Thread Safety:**
 * Uses AsyncLocalStorage to provide request-scoped table prefix isolation.
 * This is SAFE for concurrent requests in long-running Node.js servers.
 *
 * **How It Works:**
 * 1. Reads table prefix from `req.dbConfig.tablePrefix`
 * 2. Runs operation within AsyncLocalStorage.run() scope
 * 3. All database calls within the operation use the request-scoped prefix
 * 4. No manual cleanup needed - AsyncLocalStorage handles it automatically
 *
 * **Concurrency Example:**
 * ```
 * Request A (tenant_A_): AsyncLocalStorage scope A
 * Request B (tenant_B_): AsyncLocalStorage scope B (concurrent with A)
 * Request A reads data: Uses scope A's prefix (tenant_A_) ✅ CORRECT
 * Request B reads data: Uses scope B's prefix (tenant_B_) ✅ CORRECT
 * ```
 *
 * @example
 * ```typescript
 * import { withDatabaseContext } from '@togglebox/shared';
 *
 * // In controller
 * await withDatabaseContext(req, async () => {
 *   const platform = await db.platform.getPlatform('web');
 *   return platform;
 * });
 * ```
 */
export async function withDatabaseContext<T>(
  req: Request,
  operation: () => Promise<T>
): Promise<T> {
  const dbReq = req as RequestWithDatabaseContext;

  // Import getTablePrefixStorage dynamically to avoid circular dependencies
  const { getTablePrefixStorage } = require('@togglebox/database');

  // Get the AsyncLocalStorage instance
  const tablePrefixStorage = getTablePrefixStorage();

  // Run operation within AsyncLocalStorage context
  // This provides request-scoped isolation safe for concurrent requests
  return tablePrefixStorage.run(dbReq.dbConfig.tablePrefix, operation);
}
