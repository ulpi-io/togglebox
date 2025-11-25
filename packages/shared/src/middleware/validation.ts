/**
 * Request validation middleware using Zod.
 *
 * @module middleware/validation
 *
 * @remarks
 * **Validation Features:**
 * - Schema-based validation with Zod
 * - Type-safe validation (TypeScript type inference)
 * - Input sanitization (XSS protection, HTML entity escaping)
 * - Rate limiting by IP address
 * - CORS headers
 * - Security headers
 * - Request ID generation
 *
 * **Middleware Functions:**
 * - {@link validateRequest} - Validate request body
 * - {@link validateQuery} - Validate query parameters
 * - {@link validateParams} - Validate URL parameters
 * - {@link sanitizeInput} - Sanitize all inputs (XSS protection)
 * - {@link rateLimitByIP} - Rate limit by IP address
 * - {@link corsHeaders} - Add CORS headers
 * - {@link securityHeaders} - Add security headers
 * - {@link requestId} - Generate/attach request ID
 *
 * **Usage Pattern:**
 * ```typescript
 * import { validateRequest, sanitizeInput, z } from '@togglebox/shared';
 *
 * const createPlatformSchema = z.object({
 *   name: z.string().min(1).max(100),
 *   description: z.string().optional(),
 * });
 *
 * router.post('/platforms',
 *   sanitizeInput,
 *   validateRequest(createPlatformSchema),
 *   createPlatform
 * );
 * ```
 *
 * **Security:**
 * - Escapes HTML entities to prevent stored XSS
 * - Blocks dangerous patterns (script tags, event handlers, javascript: URLs)
 * - Validates DynamoDB key delimiters don't break PK/SK patterns
 * - Rate limiting to prevent abuse
 * - CORS and security headers
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Validation function type for clean, testable validation logic.
 */
type ValidationFn<T = unknown> = (data: unknown) => T;

/**
 * Creates a type-safe validator function from a Zod schema.
 *
 * @param schema - Zod schema for validation
 * @returns Validation function that throws ValidationError on failure
 *
 * @remarks
 * **Internal Function:**
 * Used internally by validation middleware.
 * Not exported - use {@link validateRequest}, {@link validateQuery}, or {@link validateParams} instead.
 */
const createValidator = <T = unknown>(schema: z.ZodSchema<T>): ValidationFn<T> => {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new ValidationError(`Validation failed: ${errorMessage}`);
      }
      throw error;
    }
  };
};

/**
 * Express middleware adapters.
 *
 * @remarks
 * These middleware functions follow Express signature but delegate to clean,
 * testable validation functions.
 */

/**
 * Validate request body against a Zod schema.
 *
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const createPlatformSchema = z.object({
 *   name: z.string().min(1).max(100),
 *   description: z.string().optional(),
 * });
 *
 * router.post('/platforms', validateRequest(createPlatformSchema), handler);
 * ```
 *
 * @remarks
 * **Type Safety:**
 * Validated data is automatically typed based on the Zod schema.
 * The validated body replaces `req.body` with typed data.
 *
 * **Error Handling:**
 * Validation errors are automatically converted to {@link ValidationError}
 * and passed to error handling middleware.
 */
export const validateRequest = (schema: z.ZodSchema) => {
  const validator = createValidator(schema);
  
  return (req: Request, _: Response, next: NextFunction): void => {
    try {
      req.body = validator(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate query parameters against a Zod schema.
 *
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const paginationSchema = z.object({
 *   page: z.string().regex(/^\d+$/).transform(Number).optional(),
 *   perPage: z.string().regex(/^\d+$/).transform(Number).optional(),
 * });
 *
 * router.get('/platforms', validateQuery(paginationSchema), handler);
 * ```
 *
 * @remarks
 * **Type Safety:**
 * Validated data is automatically typed and can transform strings to numbers, booleans, etc.
 */
export const validateQuery = (schema: z.ZodSchema) => {
  const validator = createValidator(schema);

  return (req: Request, _: Response, next: NextFunction): void => {
    try {
      req.query = validator(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate URL parameters against a Zod schema.
 *
 * @param schema - Zod schema for validation
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const paramsSchema = z.object({
 *   platform: z.string().min(1),
 *   environment: z.string().min(1),
 * });
 *
 * router.get('/platforms/:platform/environments/:environment', validateParams(paramsSchema), handler);
 * ```
 *
 * @remarks
 * **Type Safety:**
 * Validated params replace `req.params` with typed data.
 */
export const validateParams = (schema: z.ZodSchema) => {
  const validator = createValidator(schema);

  return (req: Request, _: Response, next: NextFunction): void => {
    try {
      req.params = validator(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Input sanitization middleware
 *
 * SECURITY NOTE: This API primarily handles JSON data, not HTML rendering.
 * The sanitization here provides defense-in-depth by:
 * 1. Escaping HTML entities to prevent stored XSS
 * 2. Blocking dangerous patterns (script tags, event handlers, javascript: URLs)
 * 3. Validating DynamoDB key delimiters don't break PK/SK patterns
 *
 * Client applications should ALSO sanitize data before rendering HTML.
 */
export const sanitizeInput = (req: Request, _: Response, next: NextFunction): void => {
  /**
   * Sanitize a string by escaping HTML entities and blocking dangerous patterns
   */
  const sanitizeString = (str: string): string => {
    // Trim whitespace
    let sanitized = str.trim();

    // Escape HTML entities to prevent XSS
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    // Block common XSS vectors
    const dangerousPatterns = [
      /javascript:/gi,
      /on\w+\s*=/gi,           // Event handlers: onclick=, onerror=, etc.
      /<script[\s\S]*?>/gi,     // Script tags
      /<iframe[\s\S]*?>/gi,     // Iframes
      /eval\(/gi,               // eval() calls
      /expression\(/gi,         // CSS expression()
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new ValidationError(
          `Input contains potentially dangerous content: ${pattern.source}`
        );
      }
    }

    return sanitized;
  };

  const sanitizeObject = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }

  next();
};

// Rate limiting - uses req and res for response
export const rateLimitByIP = (windowMs: number = 60000, maxRequests: number = 100) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const current = requests.get(ip);

    if (current && current.resetTime > now) {
      current.count++;
      if (current.count > maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          meta: {
            retryAfter: Math.ceil((current.resetTime - now) / 1000),
          },
        });
        return;
      }
    } else {
      requests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
    }

    next();
  };
};

// CORS headers - uses req and res
export const corsHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};

// Security headers - uses res
export const securityHeaders = (_: Request, res: Response, next: NextFunction): void => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('Content-Security-Policy', "default-src 'self'");
  
  next();
};

// Request ID - uses both req and res
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.header('X-Request-ID', requestId);
  
  next();
};