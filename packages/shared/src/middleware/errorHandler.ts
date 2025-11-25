/**
 * Centralized error handling middleware.
 *
 * @module middleware/errorHandler
 *
 * @remarks
 * **Error Handling Architecture:**
 * - Custom error classes with status codes and operational flags
 * - Centralized error handler middleware
 * - Async error wrapper for route handlers
 * - Helper functions for standardized error responses
 *
 * **Error Classes:**
 * - {@link CustomError} - Base error class (500)
 * - {@link ValidationError} - Bad request (400)
 * - {@link UnauthorizedError} - Authentication required (401)
 * - {@link ForbiddenError} - Authorization failed (403)
 * - {@link NotFoundError} - Resource not found (404)
 * - {@link ConflictError} - Resource conflict (409)
 * - {@link BadRequestError} - Invalid request (400)
 * - {@link InternalServerError} - Server error (500)
 *
 * **Usage Pattern:**
 * ```typescript
 * import { errorHandler, notFoundHandler, asyncHandler, NotFoundError } from '@togglebox/shared';
 *
 * // Route handler
 * router.get('/platforms/:id', asyncHandler(async (req, res) => {
 *   const platform = await db.platform.findById(req.params.id);
 *   if (!platform) {
 *     throw new NotFoundError('Platform not found');
 *   }
 *   res.json({ data: platform });
 * }));
 *
 * // Apply error handlers at end of middleware chain
 * app.use(notFoundHandler); // 404 handler
 * app.use(errorHandler);     // Global error handler
 * ```
 *
 * **Security:**
 * - Production: Hides stack traces and sensitive error details
 * - Development: Shows full error information for debugging
 * - Logs all errors with correlation IDs for tracing
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { ErrorResponse } from '@togglebox/core';

/**
 * Application error interface with HTTP status and operational flag.
 *
 * @remarks
 * **Operational vs Programming Errors:**
 * - Operational errors: Expected errors (validation, not found, etc.)
 * - Programming errors: Bugs in code (uncaught exceptions, etc.)
 *
 * Use `isOperational: true` for errors that are expected and safe to show to users.
 */
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: string[];
  meta?: Record<string, unknown>;
}

/**
 * Base custom error class with HTTP status code and operational flag.
 *
 * @remarks
 * **Error Properties:**
 * - `statusCode`: HTTP status code (default: 500)
 * - `isOperational`: Whether error is operational (expected) or programming bug
 * - `code`: Optional error code for client error handling
 * - `details`: Optional array of detailed error messages
 * - `meta`: Optional metadata (request ID, etc.)
 *
 * **Extending:**
 * Create custom error classes by extending this class with specific status codes.
 */
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: string[];
  meta?: Record<string, unknown>;

  /**
   * Creates a new CustomError instance.
   *
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param isOperational - Whether error is operational (default: true)
   * @param code - Optional error code
   * @param details - Optional detailed error messages
   * @param meta - Optional metadata
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: string[],
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    this.meta = meta;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400 Bad Request).
 *
 * @remarks
 * Use for request validation failures (invalid input, missing fields, etc.).
 *
 * @example
 * ```typescript
 * throw new ValidationError('Email is required');
 * ```
 */
export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Not found error (404 Not Found).
 *
 * @remarks
 * Use when a requested resource doesn't exist.
 *
 * @example
 * ```typescript
 * throw new NotFoundError('Platform not found');
 * ```
 */
export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message, 404);
  }
}

/**
 * Conflict error (409 Conflict).
 *
 * @remarks
 * Use when a resource already exists or operation conflicts with current state.
 *
 * @example
 * ```typescript
 * throw new ConflictError('Platform already exists');
 * ```
 */
export class ConflictError extends CustomError {
  constructor(message: string) {
    super(message, 409);
  }
}

/**
 * Unauthorized error (401 Unauthorized).
 *
 * @remarks
 * Use when authentication is required but not provided or invalid.
 *
 * @example
 * ```typescript
 * throw new UnauthorizedError('Invalid credentials');
 * ```
 */
export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden error (403 Forbidden).
 *
 * @remarks
 * Use when user is authenticated but lacks permission.
 *
 * @example
 * ```typescript
 * throw new ForbiddenError('Insufficient permissions');
 * ```
 */
export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Bad request error (400 Bad Request).
 *
 * @remarks
 * Use for general bad request errors (malformed syntax, invalid parameters).
 *
 * @example
 * ```typescript
 * throw new BadRequestError('Invalid request format');
 * ```
 */
export class BadRequestError extends CustomError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * Internal server error (500 Internal Server Error).
 *
 * @remarks
 * Use for unexpected server errors (database failures, external service errors).
 *
 * @example
 * ```typescript
 * throw new InternalServerError('Database connection failed');
 * ```
 */
export class InternalServerError extends CustomError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500);
  }
}

/**
 * Centralized error handling middleware.
 *
 * @param err - Error object (AppError or standard Error)
 * @param req - Express request
 * @param res - Express response
 * @param _next - Express next function (unused)
 *
 * @remarks
 * **Error Processing:**
 * 1. Logs error with correlation ID (request ID)
 * 2. Determines HTTP status code (from error or default 500)
 * 3. Sanitizes error message in production
 * 4. Sends standardized error response
 *
 * **Production vs Development:**
 * - **Production:** Hides non-operational error details, no stack traces
 * - **Development:** Shows full error details including stack traces
 *
 * **Error Response Format:**
 * ```json
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "code": "ERROR_CODE",
 *   "details": ["Field-specific errors"],
 *   "meta": {
 *     "requestId": "req-123",
 *     "stack": "..." // Development only
 *   }
 * }
 * ```
 *
 * **Usage:**
 * ```typescript
 * app.use(errorHandler); // Apply at end of middleware chain
 * ```
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const { method, url, headers, body } = req;
  const userAgent = headers['user-agent'];
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const requestId = headers['x-request-id'] as string;

  let { statusCode = 500, message, code, details, meta } = err;

  // Log error with correlation ID for tracing
  logger.error('Request failed', {
    requestId,
    method,
    url,
    statusCode,
    error: err.message,
    code,
    stack: err.stack,
    userAgent,
    ip,
    body: process.env['NODE_ENV'] === 'development' ? body : undefined,
  });

  if (process.env['NODE_ENV'] === 'production') {
    if (!err.isOperational) {
      statusCode = 500;
      message = 'Something went wrong';
      code = undefined;
      details = undefined;
      meta = undefined;
    }
  }

  const response: ErrorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (code) response.code = code;
  if (details && details.length > 0) response.details = details;

  // Add request ID to metadata for error tracking
  response.meta = {
    ...meta,
    requestId,
  };

  if (process.env['NODE_ENV'] === 'development' && err.stack) {
    response.meta = { ...response.meta, stack: err.stack };
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler for unmatched routes.
 *
 * @param req - Express request
 * @param res - Express response
 *
 * @remarks
 * **Usage:**
 * Apply before the global error handler but after all routes:
 * ```typescript
 * app.use(routes);           // All routes
 * app.use(notFoundHandler);  // 404 handler
 * app.use(errorHandler);     // Global error handler
 * ```
 *
 * **Response:**
 * Returns 404 status with standardized error response.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string;

  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
    meta: {
      requestId,
    },
  });
};

/**
 * Async error handler wrapper for Express route handlers.
 *
 * @param fn - Async route handler function
 * @returns Wrapped middleware function that catches async errors
 *
 * @example
 * ```typescript
 * router.get('/platforms/:id', asyncHandler(async (req, res) => {
 *   const platform = await db.platform.findById(req.params.id);
 *   if (!platform) {
 *     throw new NotFoundError('Platform not found'); // Automatically caught
 *   }
 *   res.json({ data: platform });
 * }));
 * ```
 *
 * @remarks
 * **Purpose:**
 * Wraps async route handlers to automatically catch promise rejections
 * and pass them to Express error handling middleware.
 *
 * **Without asyncHandler:**
 * ```typescript
 * router.get('/platforms/:id', async (req, res, next) => {
 *   try {
 *     const platform = await db.platform.findById(req.params.id);
 *     res.json({ data: platform });
 *   } catch (error) {
 *     next(error); // Must manually call next()
 *   }
 * });
 * ```
 *
 * **With asyncHandler:**
 * ```typescript
 * router.get('/platforms/:id', asyncHandler(async (req, res) => {
 *   const platform = await db.platform.findById(req.params.id);
 *   res.json({ data: platform }); // Errors automatically caught
 * }));
 * ```
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Helper functions for creating standardized error responses.
 *
 * @remarks
 * **Available Helpers:**
 * - {@link createErrorResponse} - Create error response object
 * - {@link sendValidationError} - Send 400 validation error
 * - {@link sendUnauthorizedError} - Send 401 unauthorized error
 * - {@link sendForbiddenError} - Send 403 forbidden error
 * - {@link sendNotFoundError} - Send 404 not found error
 * - {@link sendConflictError} - Send 409 conflict error
 * - {@link sendRateLimitError} - Send 429 rate limit error
 * - {@link sendUsageLimitError} - Send 429 usage limit error (billing)
 * - {@link sendInternalServerError} - Send 500 server error
 */

/**
 * Create a standardized error response object
 *
 * @param error - Error message
 * @param options - Additional error options (code, details, meta)
 * @returns Standardized error response object
 */
export function createErrorResponse(
  error: string,
  options?: {
    code?: string;
    details?: string[];
    meta?: Record<string, unknown>;
  }
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };

  if (options?.code) response.code = options.code;
  if (options?.details && options.details.length > 0) response.details = options.details;
  if (options?.meta) response.meta = options.meta;

  return response;
}

/**
 * Send a standardized validation error response (400)
 */
export function sendValidationError(
  res: Response,
  message: string = 'Validation failed',
  details?: string[]
): void {
  res.status(400).json(
    createErrorResponse(message, {
      code: 'VALIDATION_FAILED',
      details,
    })
  );
}

/**
 * Send a standardized unauthorized error response (401)
 */
export function sendUnauthorizedError(
  res: Response,
  message: string = 'Unauthorized'
): void {
  res.status(401).json(
    createErrorResponse(message, {
      code: 'UNAUTHORIZED',
    })
  );
}

/**
 * Send a standardized forbidden error response (403)
 */
export function sendForbiddenError(
  res: Response,
  message: string = 'Forbidden',
  meta?: { requiredPermission?: string; requiredRole?: string }
): void {
  res.status(403).json(
    createErrorResponse(message, {
      code: 'FORBIDDEN',
      meta,
    })
  );
}

/**
 * Send a standardized not found error response (404)
 */
export function sendNotFoundError(
  res: Response,
  message: string = 'Resource not found'
): void {
  res.status(404).json(
    createErrorResponse(message, {
      code: 'NOT_FOUND',
    })
  );
}

/**
 * Send a standardized conflict error response (409)
 */
export function sendConflictError(
  res: Response,
  message: string = 'Resource already exists'
): void {
  res.status(409).json(
    createErrorResponse(message, {
      code: 'CONFLICT',
    })
  );
}

/**
 * Send a standardized rate limit error response (429)
 */
export function sendRateLimitError(
  res: Response,
  message: string = 'Too many requests',
  retryAfter?: number
): void {
  res.status(429).json(
    createErrorResponse(message, {
      code: 'RATE_LIMIT_EXCEEDED',
      meta: retryAfter ? { retryAfter } : undefined,
    })
  );
}

/**
 * Send a standardized usage limit error response (429)
 */
export function sendUsageLimitError(
  res: Response,
  message: string,
  usage: number,
  limit: number,
  upgradeUrl?: string
): void {
  res.status(429).json(
    createErrorResponse(message, {
      code: 'API_LIMIT_EXCEEDED',
      meta: {
        usage,
        limit,
        ...(upgradeUrl && { upgradeUrl }),
      },
    })
  );
}

/**
 * Send a standardized internal server error response (500)
 */
export function sendInternalServerError(
  res: Response,
  message: string = 'Internal server error'
): void {
  res.status(500).json(
    createErrorResponse(message, {
      code: 'INTERNAL_SERVER_ERROR',
    })
  );
}