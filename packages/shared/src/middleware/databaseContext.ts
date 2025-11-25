/**
 * Database context middleware for multi-tenancy.
 *
 * @module middleware/databaseContext
 *
 * @remarks
 * **Multi-Tenancy Support:**
 * Provides request-scoped database configuration via table prefixes.
 * Used with {@link withDatabaseContext} for thread-safe multi-tenant operations.
 *
 * **Architecture:**
 * - Attaches `dbConfig` to Express Request object
 * - Table prefix injected into database layer via AsyncLocalStorage
 * - Safe for concurrent requests (no race conditions)
 *
 * **Usage Pattern:**
 * ```typescript
 * import { defaultDatabaseContext, withDatabaseContext } from '@togglebox/shared';
 *
 * // Apply middleware to all routes
 * app.use(defaultDatabaseContext());
 *
 * // In controller
 * await withDatabaseContext(req, async () => {
 *   const platform = await db.platform.getPlatform('web');
 *   return platform; // Uses req.dbConfig.tablePrefix automatically
 * });
 * ```
 *
 * **Table Prefix Examples:**
 * - Single-tenant: `''` (empty string)
 * - Multi-tenant: `'tenant_123_'` → Table: `tenant_123_platforms`
 * - Testing: `'test_'` → Table: `test_platforms`
 *
 * @see {@link withDatabaseContext} - Execute database operations with context
 * @see {@link RequestWithDatabaseContext} - Express Request with database context
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Database configuration for a request.
 *
 * @remarks
 * Used to support multi-tenancy via table prefixes.
 * Attached to Express Request via middleware.
 */
export interface DatabaseConfig {
  /**
   * Table prefix to use for this request
   * Empty string for single-tenant mode
   * 'tenant_{id}_' for multi-tenant mode
   */
  tablePrefix: string;

  /**
   * Base table name (optional override)
   */
  tableName?: string;
}

/**
 * Express Request with database context
 * Controllers use this to get the database configuration for the current request
 */
export interface RequestWithDatabaseContext extends Request {
  dbConfig: DatabaseConfig;
}

/**
 * Default database context middleware
 * Sets empty table prefix for single-tenant mode
 *
 * Usage:
 * ```typescript
 * import { defaultDatabaseContext } from '@togglebox/shared';
 * app.use(defaultDatabaseContext());
 * ```
 */
export function defaultDatabaseContext() {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as RequestWithDatabaseContext).dbConfig = {
      tablePrefix: process.env['TABLE_PREFIX'] || '',
    };
    next();
  };
}

/**
 * Create a custom database context middleware with a specific prefix
 * Useful for testing or specific deployment scenarios
 *
 * @param tablePrefix - Table prefix to use
 *
 * Usage:
 * ```typescript
 * import { createDatabaseContext } from '@togglebox/shared';
 * app.use(createDatabaseContext('staging_'));
 * ```
 */
export function createDatabaseContext(tablePrefix: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as RequestWithDatabaseContext).dbConfig = {
      tablePrefix,
    };
    next();
  };
}
