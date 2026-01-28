/**
 * @togglebox/shared - Shared server utilities and middleware.
 *
 * @packageDocumentation
 *
 * @remarks
 * **Shared Utilities:**
 * Provides common server-side utilities, middleware, and configuration
 * shared across all ToggleBox applications (API, Admin, Cloud).
 *
 * **Key Modules:**
 * - **Config:** Environment variable validation (Zod) + application constants
 * - **Logger:** Structured logging with Pino + request correlation
 * - **Middleware:** Auth, validation, error handling, database context
 * - **CloudFront:** CloudFront monitoring (status/list invalidations)
 * - **Utilities:** Pagination helpers
 *
 * **Quick Start:**
 * ```typescript
 * import { logger, validateEnv, errorHandler } from '@togglebox/shared';
 * import { config } from '@togglebox/shared/config';
 *
 * // Validate environment variables at startup
 * validateEnv({ requireAuth: true });
 *
 * // Use structured logger
 * logger.info('Application started', { port: config.env.PORT });
 *
 * // Apply error handling middleware
 * app.use(errorHandler);
 * ```
 *
 * **Architecture:**
 * - **Environment Validation:** Validates all env vars at startup with Zod
 * - **Structured Logging:** JSON logs with correlation IDs for tracing
 * - **Type Safety:** Full TypeScript support with strict mode
 * - **Request Context:** AsyncLocalStorage for multi-tenant database context
 * - **Security:** Input sanitization, CORS, rate limiting, security headers
 *
 * @see {@link config} - Environment validation and application constants
 * @see {@link logger} - Structured logging service
 * @see {@link errorHandler} - Centralized error handling middleware
 */

// Export configuration (environment variables and app constants)
// Import from '@togglebox/shared/config' for better tree-shaking
// Centralized configuration added in Phase 8.1 - includes env validation (Zod) and app constants
export * as config from "./config";

// Export logger
export * from "./logger";

// Export CloudFront service for monitoring endpoints (getInvalidation, listInvalidations)
// For cache invalidation operations, use @togglebox/cache package instead
export * from "./cloudfront";

// Export all middleware
export * from "./middleware/auth";
export * from "./middleware/databaseContext";
export * from "./middleware/databaseExecutor";
export * from "./middleware/errorHandler";
export * from "./middleware/validation";

// Export utilities
export * from "./utils/pagination";
