/**
 * Express middleware for HTTP caching headers.
 *
 * @module middleware
 *
 * @remarks
 * **Available Middleware:**
 * - {@link cacheHeaders} - Enable caching with configurable TTL (for GET requests)
 * - {@link noCacheHeaders} - Disable caching (for mutation endpoints)
 *
 * **Usage Pattern:**
 * ```typescript
 * import { cacheHeaders, noCacheHeaders } from '@togglebox/cache';
 *
 * // Enable caching on public API
 * app.use('/api/v1/platforms', cacheHeaders({ ttl: 3600, maxAge: 86400 }));
 *
 * // Disable caching on internal API
 * app.use('/api/v1/internal', noCacheHeaders());
 * ```
 *
 * **Cache-Control Directives:**
 * - `public`: Cacheable by CDNs and browsers
 * - `max-age`: Browser cache TTL (seconds)
 * - `s-maxage`: Shared/CDN cache TTL (seconds)
 * - `no-cache`: Force revalidation (mutations)
 */

export { cacheHeaders, noCacheHeaders } from "./cacheHeaders";
