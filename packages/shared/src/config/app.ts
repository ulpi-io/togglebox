/**
 * Application Configuration
 *
 * Centralizes all application-level configuration constants and defaults.
 * This file consolidates hardcoded values to improve maintainability and
 * make configuration changes easier.
 *
 * @remarks
 * Configuration is organized by functional area:
 * - Server settings (ports, versions)
 * - Security settings (HSTS, CORS, CSP)
 * - Rate limiting
 * - Request parsing
 * - Caching
 *
 * Environment-specific values are accessed via the `env` module,
 * while application constants are defined here.
 */

import { env } from "./env";

/**
 * Application version
 * Can be overridden by npm_package_version environment variable
 */
export const APP_VERSION = process.env["npm_package_version"] || "1.0.0";

/**
 * Application name and description
 */
export const APP_NAME = "ToggleBox Config Service";
export const APP_DESCRIPTION = "Remote configuration and feature flag service";

/**
 * Security Configuration
 */
export const SECURITY = {
  /**
   * HTTP Strict Transport Security (HSTS)
   */
  hsts: {
    /** Max age in seconds (1 year = 31,536,000 seconds) */
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  /**
   * Content Security Policy (CSP)
   */
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },

  /**
   * CORS Configuration
   */
  cors: {
    /** Allowed HTTP methods */
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    /** Allowed request headers */
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Request-ID",
    ],

    /** Preflight cache duration in seconds (24 hours = 86,400 seconds) */
    maxAge: 86400,
  },
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT = {
  /**
   * Default rate limit for all endpoints (per IP address)
   */
  default: {
    /** Time window in milliseconds (1 minute = 60,000 ms) */
    windowMs: env?.RATE_LIMIT_WINDOW_MS || 60000,

    /** Maximum requests per window */
    max: env?.RATE_LIMIT_MAX_REQUESTS || 100,

    /** Error message when limit exceeded */
    message: "Too many requests from this IP, please try again later",
  },

  /**
   * Stricter rate limit for authentication endpoints
   */
  auth: {
    /** Time window in milliseconds (15 minutes = 900,000 ms) */
    windowMs: 900000,

    /** Maximum requests per window */
    max: 5,

    message: "Too many authentication attempts, please try again later",
  },

  /**
   * Rate limit for write operations (internal endpoints)
   */
  write: {
    /** Time window in milliseconds (1 minute = 60,000 ms) */
    windowMs: 60000,

    /** Maximum requests per window */
    max: 30,

    message: "Too many write operations, please try again later",
  },
} as const;

/**
 * Request Parsing Configuration
 */
export const REQUEST = {
  /**
   * JSON body parser size limit
   * @default '10mb' - Allows large configuration payloads
   */
  jsonLimit: "10mb",

  /**
   * URL-encoded body parser size limit
   * @default '10mb' - Matches JSON limit
   */
  urlencodedLimit: "10mb",

  /**
   * URL-encoded parser configuration
   */
  urlencodedExtended: true,
} as const;

/**
 * Cache Configuration
 */
export const CACHE = {
  /**
   * Default cache TTL (Time To Live) in seconds
   * Browser cache duration
   * @default 3600 - 1 hour
   */
  ttl: env?.CACHE_TTL || 3600,

  /**
   * CDN/shared cache max age in seconds
   * CloudFront or other CDN cache duration
   * @default 86400 - 24 hours
   */
  maxAge: env?.CACHE_MAX_AGE || 86400,

  /**
   * Paths that should never be cached
   */
  noCachePaths: [
    "/api/v1/internal", // All internal write operations
    "/health", // Health check should reflect current state
  ],

  /**
   * Paths that should be cached
   */
  cachedPaths: [
    "/api/v1/platforms", // Public read-only endpoints
  ],
} as const;

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  /**
   * Default page size for paginated endpoints
   */
  defaultLimit: 20,

  /**
   * Maximum page size allowed
   */
  maxLimit: 100,

  /**
   * Default offset for pagination
   */
  defaultOffset: 0,
} as const;

/**
 * Timeout Configuration
 */
export const TIMEOUTS = {
  /**
   * Database query timeout in milliseconds
   * @default 30000 - 30 seconds
   */
  database: 30000,

  /**
   * HTTP request timeout in milliseconds
   * @default 60000 - 60 seconds
   */
  http: 60000,

  /**
   * Graceful shutdown timeout in milliseconds
   * @default 10000 - 10 seconds
   */
  shutdown: 10000,
} as const;

/**
 * API Configuration
 */
export const API = {
  /**
   * API version prefix
   */
  version: "v1",

  /**
   * API base path
   */
  basePath: "/api/v1",

  /**
   * Internal API base path (write operations)
   */
  internalBasePath: "/api/v1/internal",
} as const;

/**
 * Helper function to get all configuration
 * Useful for debugging and documentation
 */
export function getAllConfig() {
  return {
    app: {
      name: APP_NAME,
      description: APP_DESCRIPTION,
      version: APP_VERSION,
    },
    security: SECURITY,
    rateLimit: RATE_LIMIT,
    request: REQUEST,
    cache: CACHE,
    pagination: PAGINATION,
    timeouts: TIMEOUTS,
    api: API,
  };
}

/**
 * Type-safe configuration export
 */
export const appConfig = {
  APP_NAME,
  APP_DESCRIPTION,
  APP_VERSION,
  SECURITY,
  RATE_LIMIT,
  REQUEST,
  CACHE,
  PAGINATION,
  TIMEOUTS,
  API,
} as const;

/**
 * Type of application configuration
 */
export type AppConfig = typeof appConfig;
