/**
 * Structured logging service using Pino.
 *
 * @module logger
 *
 * @remarks
 * **Logging Features:**
 * - Structured JSON logging with correlation IDs
 * - Request/response logging via pinoHttp middleware
 * - Automatic field redaction (passwords, tokens, secrets)
 * - Pretty-printed logs in development, JSON in production
 * - Integration with Grafana Cloud (production)
 *
 * **Log Levels (lowest to highest):**
 * - `trace` - Very detailed debugging (development only)
 * - `debug` - Debugging information
 * - `info` - General informational messages
 * - `warn` - Warning messages (non-critical issues)
 * - `error` - Error messages (caught errors)
 * - `fatal` - Fatal errors (application crash)
 *
 * **Usage Pattern:**
 * ```typescript
 * import { logger } from '@togglebox/shared';
 *
 * // Basic logging
 * logger.info('User created', { userId: '123', email: 'user@example.com' });
 * logger.error('Database connection failed', new Error('Connection timeout'));
 *
 * // Request logging middleware
 * app.use(logger.getHttpLogger());
 *
 * // Child logger with correlation context
 * const requestLogger = logger.child({ requestId: req.id });
 * requestLogger.info('Processing request');
 * ```
 *
 * **Security:**
 * - Automatically redacts: `password`, `apiKey`, `secret`, `token`, `authorization`
 * - Never log full request/response bodies containing sensitive data
 * - Correlation IDs for tracing requests across services
 */

import pino from "pino";
import pinoHttp from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * Structured logging service with Pino.
 *
 * @remarks
 * **Development Mode:**
 * - Pretty-printed logs with colors
 * - Human-readable timestamps
 * - Excludes `pid` and `hostname` for cleaner output
 *
 * **Production Mode:**
 * - JSON-formatted logs for machine parsing
 * - ISO timestamps
 * - Sent to Grafana Cloud (if configured)
 *
 * **Field Redaction:**
 * Automatically removes sensitive fields from logs:
 * - `password`, `apiKey`, `secret`, `token`, `authorization`
 *
 * **HTTP Request Logging:**
 * Includes correlation IDs (`x-request-id`) for request tracing.
 */
export class LoggerService {
  private logger: pino.Logger;
  private httpLogger: unknown; // pinoHttp middleware instance

  /**
   * Creates a new LoggerService instance.
   *
   * @remarks
   * **Environment Variables:**
   * - `NODE_ENV`: Controls pretty-printing (development) vs JSON (production)
   * - `LOG_LEVEL`: Minimum log level (trace/debug/info/warn/error/fatal)
   *
   * **Automatic Redaction:**
   * Sensitive fields are automatically removed from all logs.
   */
  constructor() {
    const isDevelopment = process.env["NODE_ENV"] === "development";
    const logPretty = process.env["LOG_PRETTY"] !== "false";
    const logLevel = process.env["LOG_LEVEL"] || "info";

    const baseConfig = {
      level: logLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: ["password", "apiKey", "secret", "token", "authorization"],
        remove: true,
      },
    };

    if (isDevelopment && logPretty) {
      this.logger = pino({
        ...baseConfig,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      });
    } else {
      this.logger = pino(baseConfig);
    }

    this.httpLogger = this.createHttpLogger(this.logger);
  }

  /**
   * Get the underlying Pino logger instance.
   *
   * @returns The Pino logger instance
   *
   * @remarks
   * Use this when you need direct access to Pino's API.
   * Prefer using the wrapper methods (info, error, etc.) for consistency.
   */
  getLogger(): pino.Logger {
    return this.logger;
  }

  /**
   * Get the HTTP request logging middleware.
   *
   * @returns The pinoHttp middleware instance
   *
   * @example
   * ```typescript
   * import express from 'express';
   * import { logger } from '@togglebox/shared';
   *
   * const app = express();
   * app.use(logger.getHttpLogger());
   * ```
   *
   * @remarks
   * **Automatic Logging:**
   * - Logs all HTTP requests with method, URL, status code, response time
   * - Generates request ID if not present in `x-request-id` header
   * - Custom log messages for success and error responses
   */
  getHttpLogger(): unknown {
    return this.httpLogger;
  }

  /**
   * Create a child logger with correlation context.
   *
   * @param context - Context to add to all log entries (e.g., { requestId: '123' })
   * @returns A new LoggerService instance with the context
   *
   * @example
   * ```typescript
   * const requestLogger = logger.child({ requestId: req.id, userId: req.user.id });
   * requestLogger.info('Processing payment'); // Automatically includes requestId and userId
   * ```
   *
   * @remarks
   * **Use Cases:**
   * - Add request ID to all logs within a request handler
   * - Add user ID to all logs for a user session
   * - Add tenant ID to all logs in multi-tenant scenarios
   *
   * **HTTP Logging:**
   * The child logger's httpLogger uses the child's logger with context,
   * so HTTP logs from `childLogger.getHttpLogger()` will include the context.
   */
  child(context: Record<string, unknown>): LoggerService {
    const childLogger = new LoggerService();
    childLogger.logger = this.logger.child(context);
    // Create new httpLogger using child's logger so HTTP logs include context
    childLogger.httpLogger = this.createHttpLogger(childLogger.logger);
    return childLogger;
  }

  /**
   * Creates pinoHttp middleware with consistent configuration.
   * @internal
   */
  private createHttpLogger(logger: pino.Logger): unknown {
    return pinoHttp({
      logger,
      genReqId: (req: IncomingMessage) => {
        const headers = (
          req as IncomingMessage & {
            headers: Record<string, string | string[] | undefined>;
          }
        ).headers;
        return (
          (headers["x-request-id"] as string) ||
          `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        );
      },
      customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
        const httpReq = req as IncomingMessage & {
          method?: string;
          url?: string;
        };
        const httpRes = res as ServerResponse & { statusCode: number };
        return `${httpReq.method} ${httpReq.url} ${httpRes.statusCode} - ${httpRes.getHeader("content-length") || 0}b`;
      },
      customErrorMessage: (
        req: IncomingMessage,
        res: ServerResponse,
        error: Error,
      ) => {
        const httpReq = req as IncomingMessage & {
          method?: string;
          url?: string;
        };
        const httpRes = res as ServerResponse & { statusCode: number };
        return `${httpReq.method} ${httpReq.url} ${httpRes.statusCode} - ${error.message}`;
      },
      customAttributeKeys: {
        req: "request",
        res: "response",
        err: "error",
        responseTime: "responseTimeMs",
        reqId: "requestId",
      },
    });
  }

  /**
   * Log an informational message.
   *
   * @param message - Log message
   * @param data - Optional structured data to include in log
   *
   * @example
   * ```typescript
   * logger.info('User created successfully');
   * logger.info('User created', { userId: '123', email: 'user@example.com' });
   * ```
   */
  info(message: string, data?: Record<string, unknown>): void {
    if (data) {
      this.logger.info(data, message);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * Log an error message.
   *
   * @param message - Error description
   * @param error - Optional error object or data
   *
   * @example
   * ```typescript
   * logger.error('Database connection failed', new Error('Connection timeout'));
   * logger.error('Payment processing failed', { userId: '123', amount: 100 });
   * ```
   *
   * @remarks
   * **Stack Traces:**
   * If an Error object is passed, the stack trace is automatically included.
   */
  error(message: string, error?: Error | unknown): void {
    if (error) {
      this.logger.error(error, message);
    } else {
      this.logger.error(message);
    }
  }

  /**
   * Log a warning message.
   *
   * @param message - Warning description
   * @param data - Optional structured data to include in log
   *
   * @example
   * ```typescript
   * logger.warn('API rate limit approaching', { usage: 950, limit: 1000 });
   * ```
   */
  warn(message: string, data?: Record<string, unknown>): void {
    if (data) {
      this.logger.warn(data, message);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Log a debug message.
   *
   * @param message - Debug information
   * @param data - Optional structured data to include in log
   *
   * @example
   * ```typescript
   * logger.debug('Cache lookup', { key: 'user:123', hit: true });
   * ```
   *
   * @remarks
   * Only logged if `LOG_LEVEL=debug` or lower.
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (data) {
      this.logger.debug(data, message);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * Log a trace message (very detailed debugging).
   *
   * @param message - Trace information
   * @param data - Optional structured data to include in log
   *
   * @example
   * ```typescript
   * logger.trace('Query executed', { sql: 'SELECT * FROM users', rows: 10 });
   * ```
   *
   * @remarks
   * Only logged if `LOG_LEVEL=trace`.
   * **Not recommended for production** - generates excessive logs.
   */
  trace(message: string, data?: Record<string, unknown>): void {
    if (data) {
      this.logger.trace(data, message);
    } else {
      this.logger.trace(message);
    }
  }

  /**
   * Log a fatal error (application crash).
   *
   * @param message - Fatal error description
   * @param error - Optional error object or data
   *
   * @example
   * ```typescript
   * logger.fatal('Failed to connect to database on startup', error);
   * process.exit(1);
   * ```
   *
   * @remarks
   * **Critical Errors Only:**
   * Use this level only for errors that require immediate attention
   * and indicate the application cannot continue running.
   */
  fatal(message: string, error?: Error | unknown): void {
    if (error) {
      this.logger.fatal(error, message);
    } else {
      this.logger.fatal(message);
    }
  }

  /**
   * Log an API request with structured metadata.
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Request path
   * @param statusCode - HTTP status code
   * @param duration - Request duration in milliseconds
   * @param userAgent - Optional User-Agent header
   * @param requestId - Optional correlation ID
   *
   * @example
   * ```typescript
   * logger.logApiRequest('GET', '/api/v1/platforms', 200, 45, 'curl/7.64.1', 'req-123');
   * ```
   */
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userAgent?: string,
    requestId?: string,
  ): void {
    this.logger.info(
      {
        type: "api_request",
        requestId,
        method,
        path,
        statusCode,
        duration,
        userAgent,
      },
      "API Request",
    );
  }

  /**
   * Log a cache operation (hit/miss).
   *
   * @param operation - Operation type (get, set, delete)
   * @param key - Cache key
   * @param hit - Whether the operation was a cache hit
   * @param duration - Operation duration in milliseconds
   * @param requestId - Optional correlation ID
   *
   * @example
   * ```typescript
   * logger.logCacheOperation('get', 'config:web:production', true, 2, 'req-123');
   * ```
   */
  logCacheOperation(
    operation: string,
    key: string,
    hit: boolean,
    duration: number,
    requestId?: string,
  ): void {
    this.logger.info(
      {
        type: "cache_operation",
        requestId,
        operation,
        key,
        hit,
        duration,
      },
      "Cache Operation",
    );
  }

  /**
   * Log a database operation.
   *
   * @param operation - Operation type (query, insert, update, delete)
   * @param table - Table or collection name
   * @param duration - Operation duration in milliseconds
   * @param success - Whether the operation succeeded
   * @param requestId - Optional correlation ID
   *
   * @example
   * ```typescript
   * logger.logDatabaseOperation('query', 'platforms', 15, true, 'req-123');
   * ```
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    requestId?: string,
  ): void {
    this.logger.info(
      {
        type: "database_operation",
        requestId,
        operation,
        table,
        duration,
        success,
      },
      "Database Operation",
    );
  }

  /**
   * Log a CloudFront cache invalidation.
   *
   * @param invalidationId - CloudFront invalidation ID
   * @param paths - Array of invalidated paths
   * @param success - Whether invalidation succeeded
   * @param requestId - Optional correlation ID
   *
   * @example
   * ```typescript
   * logger.logCloudFrontInvalidation('INV123', ['/api/v1/platforms/*'], true, 'req-123');
   * ```
   */
  logCloudFrontInvalidation(
    invalidationId: string,
    paths: string[],
    success: boolean,
    requestId?: string,
  ): void {
    this.logger.info(
      {
        type: "cloudfront_invalidation",
        requestId,
        invalidationId,
        paths,
        success,
      },
      "CloudFront Invalidation",
    );
  }

  /**
   * Log an authentication attempt.
   *
   * @param userId - User ID or identifier
   * @param success - Whether authentication succeeded
   * @param method - Authentication method (JWT, API_KEY)
   * @param requestId - Optional correlation ID
   *
   * @example
   * ```typescript
   * logger.logAuthentication('user-123', true, 'JWT', 'req-123');
   * ```
   *
   * @remarks
   * **Security:**
   * Never log passwords, tokens, or API keys.
   */
  logAuthentication(
    userId: string,
    success: boolean,
    method: string,
    requestId?: string,
  ): void {
    this.logger.info(
      {
        type: "authentication",
        requestId,
        userId,
        success,
        method,
      },
      "Authentication",
    );
  }

  /**
   * Log an authorization check.
   *
   * @param userId - User ID or identifier
   * @param resource - Resource being accessed
   * @param action - Action being performed (read, write, delete)
   * @param granted - Whether authorization was granted
   * @param requestId - Optional correlation ID
   *
   * @example
   * ```typescript
   * logger.logAuthorization('user-123', 'platform:web', 'config:write', true, 'req-123');
   * ```
   */
  logAuthorization(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    requestId?: string,
  ): void {
    this.logger.info(
      {
        type: "authorization",
        requestId,
        userId,
        resource,
        action,
        granted,
      },
      "Authorization",
    );
  }
}

/**
 * Singleton logger instance for application-wide use.
 *
 * @example
 * ```typescript
 * import { logger } from '@togglebox/shared';
 *
 * logger.info('Application started');
 * logger.error('Failed to process request', error);
 * ```
 */

export const logger = new LoggerService();
