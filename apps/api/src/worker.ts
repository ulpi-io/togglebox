/**
 * Cloudflare Workers deployment handler.
 *
 * Wraps the Express application for serverless execution in Cloudflare Workers.
 * Uses httpServerHandler from cloudflare:node for native Express support.
 *
 * @remarks
 * **Deployment:**
 * - Deploy using Wrangler (`wrangler deploy`)
 * - Handler: Worker fetch handler
 * - Configuration in `wrangler.toml`
 *
 * **Features:**
 * - Native Express.js support (as of 2025)
 * - D1 database binding integration
 * - Edge computing with global distribution
 * - KV storage for caching (optional)
 *
 * **Note:**
 * This file uses Cloudflare Workers-specific imports that are only available
 * at runtime in Cloudflare Workers environment.
 */

/// <reference types="@cloudflare/workers-types" />

// Dynamic import for cloudflare:node (only available in Workers runtime)
import { httpServerHandler } from 'cloudflare:node';
import app from './app';
import { logger } from '@togglebox/shared';
import { createDatabaseRepositories } from '@togglebox/database';

/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  /**
   * D1 database binding (configured in wrangler.toml)
   */
  DB: D1Database;

  /**
   * KV namespace for caching (optional)
   */
  CACHE?: KVNamespace;

  /**
   * Environment variables
   */
  ENVIRONMENT?: string;
  NODE_ENV?: string;
  CORS_ORIGIN?: string;
  JWT_SECRET?: string;
  API_KEY_SECRET?: string;
  ENABLE_AUTHENTICATION?: string;
}

/**
 * Cloudflare Workers D1 Database type
 */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Global variable to store database repositories
 * Initialized once per Worker instance
 */
let databaseRepositories: ReturnType<typeof createDatabaseRepositories> | null = null;

/**
 * Initialize database repositories with D1 binding
 *
 * @param db - D1 database binding from environment
 */
function initializeDatabase(db: D1Database) {
  if (!databaseRepositories) {
    databaseRepositories = createDatabaseRepositories({
      type: 'd1',
      d1Database: db,
    });
    logger.info('D1 database repositories initialized');
  }
  return databaseRepositories;
}

/**
 * Cloudflare Workers fetch handler
 *
 * @param request - Incoming HTTP request
 * @param env - Environment bindings (D1, KV, etc.)
 * @param ctx - Execution context for waitUntil and passThroughOnException
 * @returns Promise resolving to HTTP response
 *
 * @remarks
 * This handler:
 * 1. Initializes D1 database connection
 * 2. Wraps Express app using httpServerHandler
 * 3. Logs request/response details
 * 4. Handles errors gracefully
 *
 * @example
 * ```typescript
 * // In wrangler.toml:
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "remote-config-db"
 * database_id = "..."
 * ```
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize database with D1 binding
      initializeDatabase(env.DB);

      // Log incoming request (SECURITY: redact sensitive headers)
      const headers = Object.fromEntries(request.headers.entries());
      // Remove sensitive headers to prevent secret exposure in logs
      delete headers['authorization'];
      delete headers['x-api-key'];
      delete headers['cookie'];

      logger.info('Cloudflare Worker request received', {
        method: request.method,
        url: request.url,
        headers,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cloudflare-specific metadata not in standard Request type
        cf: (request as any).cf,
      });

      // Use httpServerHandler to handle Express app
      // This converts Cloudflare Request to Node.js-compatible request
      // @ts-expect-error - httpServerHandler types may not be fully accurate
      const handler = httpServerHandler(app);
      // @ts-expect-error - handler is callable in Workers runtime
      const response = await handler(request);

      // Log response
      logger.info('Cloudflare Worker response sent', {
        status: response.status,
        statusText: response.statusText,
      });

      return response;
    } catch (error) {
      logger.fatal('Cloudflare Worker request failed', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },

  /**
   * Optional: Scheduled event handler for cron jobs
   *
   * @example
   * ```typescript
   * // In wrangler.toml:
   * [triggers]
   * crons = ["0 0 * * *"]  // Run daily at midnight
   * ```
   */
  async scheduled(event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    logger.info('Scheduled event triggered', {
      cron: event.cron,
      scheduledTime: new Date(event.scheduledTime).toISOString(),
    });

    // Example: Clean up old config versions
    // const db = initializeDatabase(env.DB);
    // await cleanupOldVersions(db);
  },
};
