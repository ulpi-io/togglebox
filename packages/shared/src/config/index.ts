/**
 * Configuration module for environment variables and application constants.
 *
 * @module config
 *
 * @remarks
 * **Configuration Architecture:**
 * - **env.ts:** Environment variable validation with Zod
 * - **app.ts:** Application constants and defaults
 *
 * **Usage Pattern:**
 * ```typescript
 * import { validateEnv, env, appConfig } from '@togglebox/shared/config';
 *
 * // Validate environment variables at startup
 * validateEnv({ requireAuth: true });
 *
 * // Access validated environment variables
 * const port = env.PORT;
 * const dbType = env.DB_TYPE;
 *
 * // Access application constants
 * const apiVersion = appConfig.API.version;
 * const cacheMaxAge = appConfig.CACHE.maxAge;
 * ```
 *
 * **Environment Validation:**
 * - Validates all env vars at startup with Zod
 * - Prevents application startup with invalid configuration
 * - Provides helpful error messages with examples
 * - Supports multiple database types, auth providers, billing systems
 *
 * **Application Constants:**
 * - Security: HSTS, CSP, CORS configuration
 * - Rate limiting: Default and endpoint-specific limits
 * - Request parsing: Size limits for JSON/URL-encoded bodies
 * - Caching: TTL and max-age defaults
 * - API: Version prefix and base paths
 *
 * @see {@link validateEnv} - Validate environment variables
 * @see {@link env} - Validated environment variables
 * @see {@link appConfig} - Application constants
 */

// Environment configuration
export * from './env';

// Application configuration
export * from './app';
