/**
 * @togglebox/cache - CDN cache management and HTTP caching middleware.
 *
 * @packageDocumentation
 *
 * @remarks
 * **CDN Cache Invalidation:**
 * Provides unified interface for cache invalidation across multiple CDN providers:
 * - AWS CloudFront (native AWS SDK integration)
 * - Cloudflare (REST API integration)
 * - No-op provider for local development
 *
 * **HTTP Caching Headers:**
 * Express middleware for setting Cache-Control headers:
 * - `cacheHeaders()` - Enable caching with configurable TTL
 * - `noCacheHeaders()` - Disable caching for mutation endpoints
 *
 * **Quick Start:**
 * ```typescript
 * import express from 'express';
 * import { createCacheProvider, cacheHeaders } from '@togglebox/cache';
 *
 * const app = express();
 *
 * // Create cache provider (CloudFront/Cloudflare/NoOp)
 * const cache = createCacheProvider({
 *   enabled: true,
 *   provider: 'cloudfront',
 *   cloudfront: {
 *     distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
 *     region: 'us-east-1'
 *   }
 * });
 *
 * // Apply cache headers to GET endpoints
 * app.use('/api/v1/platforms', cacheHeaders({
 *   ttl: 3600,      // 1 hour browser cache
 *   maxAge: 86400   // 24 hours CDN cache
 * }));
 *
 * // Invalidate cache after mutations
 * app.post('/api/v1/internal/platforms', async (req, res) => {
 *   // ... create platform
 *   await cache.invalidatePlatformCache(platformName);
 *   res.status(201).json({ data: platform });
 * });
 * ```
 *
 * **Key Features:**
 * - **Multi-Provider Support:** CloudFront, Cloudflare, or no-op
 * - **Granular Invalidation:** Global, platform, environment, version-specific
 * - **Express Middleware:** Automatic Cache-Control header injection
 * - **Type Safety:** Full TypeScript support with interfaces
 * - **Logging:** Structured logging via @togglebox/shared
 *
 * **CDN Providers:**
 * - **CloudFront:** Best for AWS deployments (native SDK, fast invalidation)
 * - **Cloudflare:** Best for multi-cloud (REST API, global network)
 * - **NoOp:** Best for local development (no external dependencies)
 *
 * @see {@link CacheProvider} - Cache provider interface
 * @see {@link createCacheProvider} - Factory function
 * @see {@link cacheHeaders} - Cache headers middleware
 */

// Types
export type {
  CacheProvider,
  CacheConfig,
  CacheHeadersOptions,
} from "./types/CacheProvider";

// Providers
export {
  CloudFrontCacheProvider,
  CloudflareCacheProvider,
  NoOpCacheProvider,
} from "./providers";

// Factory
export { createCacheProvider } from "./factory";

// Middleware
export { cacheHeaders, noCacheHeaders } from "./middleware";
