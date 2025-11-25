/**
 * Cache provider interface for CDN cache invalidation.
 *
 * @remarks
 * **Implementations:**
 * - {@link CloudFrontCacheProvider} - AWS CloudFront via AWS SDK
 * - {@link CloudflareCacheProvider} - Cloudflare via REST API
 * - {@link NoOpCacheProvider} - No-op for local development
 *
 * **Usage Pattern:**
 * ```typescript
 * const cache: CacheProvider = createCacheProvider(config);
 *
 * // Invalidate after mutations
 * await cache.invalidatePlatformCache('web');
 * await cache.invalidateEnvironmentCache('web', 'production');
 * ```
 *
 * **Granularity Levels:**
 * 1. Global: All caches (`invalidateGlobalCache`)
 * 2. Platform: All environments in platform (`invalidatePlatformCache`)
 * 3. Environment: All versions in environment (`invalidateEnvironmentCache`)
 * 4. Version: Specific configuration version (`invalidateVersionCache`)
 * 5. Feature Flag: Single feature flag (`invalidateFeatureFlagCache`)
 * 6. Custom: Arbitrary paths (`invalidateCache`)
 */

export interface CacheProvider {
  /**
   * Invalidate cache for specific paths
   * @param paths - Array of paths to invalidate (e.g., ['/api/v1/platforms/*'])
   * @returns Invalidation ID or null if disabled
   */
  invalidateCache(paths: string[]): Promise<string | null>;

  /**
   * Invalidate all caches globally
   * @returns Invalidation ID or null if disabled
   */
  invalidateGlobalCache(): Promise<string | null>;

  /**
   * Invalidate cache for a specific platform
   * @param platform - Platform name
   * @returns Invalidation ID or null if disabled
   */
  invalidatePlatformCache(platform: string): Promise<string | null>;

  /**
   * Invalidate cache for a specific environment within a platform
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Invalidation ID or null if disabled
   */
  invalidateEnvironmentCache(platform: string, environment: string): Promise<string | null>;

  /**
   * Invalidate cache for a specific version within a platform and environment
   * @param platform - Platform name
   * @param environment - Environment name
   * @param version - Version timestamp (ISO-8601)
   * @returns Invalidation ID or null if disabled
   */
  invalidateVersionCache(platform: string, environment: string, version: string): Promise<string | null>;

  /**
   * Invalidate cache for a specific feature flag
   * @param platform - Platform name
   * @param environment - Environment name
   * @param flagName - Feature flag name
   * @returns Invalidation ID or null if disabled
   */
  invalidateFeatureFlagCache(platform: string, environment: string, flagName: string): Promise<string | null>;

  /**
   * Generate cache paths based on platform, environment, and version
   * @param platform - Optional platform name
   * @param environment - Optional environment name
   * @param version - Optional version timestamp
   * @returns Array of paths to invalidate
   */
  generateCachePaths(platform?: string, environment?: string, version?: string): string[];

  /**
   * Check if cache provider is enabled
   * @returns true if caching is enabled, false otherwise
   */
  isEnabled(): boolean;
}

/**
 * Cache Provider Configuration
 */
export interface CacheConfig {
  /** Enable or disable caching */
  enabled: boolean;

  /** Cache provider type */
  provider?: 'cloudfront' | 'cloudflare' | 'none';

  /** CloudFront-specific configuration */
  cloudfront?: {
    distributionId?: string;
    region?: string;
  };

  /** Cloudflare-specific configuration */
  cloudflare?: {
    zoneId?: string;
    apiToken?: string;
  };
}

/**
 * Cache Headers Middleware Options
 */
export interface CacheHeadersOptions {
  /** Browser cache TTL in seconds (default: 3600 = 1 hour) */
  ttl?: number;

  /** Shared/CDN cache TTL in seconds (default: 86400 = 24 hours) */
  maxAge?: number;

  /** Custom Cache-Control directives (default: 'public') */
  cacheControl?: string;

  /** Only apply to specific paths (regex pattern) */
  pathPattern?: RegExp;
}
