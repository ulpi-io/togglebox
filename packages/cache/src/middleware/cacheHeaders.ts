import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CacheHeadersOptions } from '../types/CacheProvider';

/**
 * Express middleware for setting Cache-Control headers on GET requests.
 *
 * Automatically adds appropriate cache headers for CDN caching.
 *
 * @param options - Cache headers configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // Basic usage with defaults (1 hour browser, 24 hours CDN)
 * app.use('/api/v1/platforms', cacheHeaders());
 *
 * // Custom TTL values
 * app.use('/api/v1/platforms', cacheHeaders({
 *   ttl: 1800,      // 30 minutes browser cache
 *   maxAge: 43200   // 12 hours CDN cache
 * }));
 *
 * // Only apply to specific paths
 * app.use(cacheHeaders({
 *   pathPattern: /^\/api\/v1\/platforms/
 * }));
 * ```
 */
export function cacheHeaders(options: CacheHeadersOptions = {}): RequestHandler {
  const {
    ttl = 3600,              // Default: 1 hour browser cache
    maxAge = 86400,          // Default: 24 hours CDN/shared cache
    cacheControl = 'public', // Default: public (cacheable by CDN)
    pathPattern,             // Optional: only apply to matching paths
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to GET requests (never cache mutations)
    if (req.method !== 'GET') {
      return next();
    }

    // If path pattern specified, only apply to matching paths
    if (pathPattern && !pathPattern.test(req.path)) {
      return next();
    }

    // Set Cache-Control header
    // Format: "public, max-age=3600, s-maxage=86400"
    // - public: Can be cached by CDNs and browsers
    // - max-age: Browser cache TTL (seconds)
    // - s-maxage: Shared/CDN cache TTL (seconds)
    res.setHeader(
      'Cache-Control',
      `${cacheControl}, max-age=${ttl}, s-maxage=${maxAge}`
    );

    next();
  };
}

/**
 * Express middleware to disable caching (force revalidation).
 *
 * Sets Cache-Control to no-cache, forcing browsers and CDNs to revalidate.
 *
 * @example
 * ```typescript
 * // Disable caching on internal/mutation endpoints
 * app.use('/api/v1/internal', noCacheHeaders());
 * ```
 */
export function noCacheHeaders(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  };
}
