/**
 * Server actions for cache invalidation management.
 *
 * @module actions/cache
 *
 * @remarks
 * These Next.js server actions handle manual cache invalidation for the CDN layer.
 * The system uses CloudFront (AWS) or Cloudflare CDN for caching API responses.
 * When configurations or feature flags are updated, cached responses need to be
 * invalidated to ensure clients receive fresh data.
 *
 * **Cache Providers:**
 * - CloudFront (AWS Lambda deployment)
 * - Cloudflare Cache API (Cloudflare Workers deployment)
 *
 * **Invalidation Strategies:**
 * - **Granular**: Invalidate specific platform/environment/version paths
 * - **Global**: Invalidate all cached responses (use sparingly, expensive operation)
 *
 * **When to Invalidate:**
 * - After deploying new configuration version
 * - After updating feature flag state or rollout
 * - After deleting platform, environment, or configuration
 * - When debugging cache-related issues
 */
'use server';

import { invalidateCacheApi, invalidateAllCacheApi } from '@/lib/api/cache';

/**
 * Invalidates cached responses for specific platform, environment, or version.
 *
 * @param platform - Optional platform name to invalidate (e.g., "web")
 * @param environment - Optional environment name to invalidate (e.g., "production")
 * @param version - Optional version to invalidate (e.g., "1.2.3")
 *
 * @returns Promise resolving to invalidation result with success status and data/error
 *
 * @remarks
 * **Granular Invalidation:**
 * This function supports granular cache invalidation by providing optional parameters:
 * - Provide all parameters to invalidate a specific version
 * - Provide only platform + environment to invalidate all versions in that environment
 * - Provide only platform to invalidate all environments in that platform
 * - Provide no parameters to invalidate all caches (same as invalidateAllCacheAction)
 *
 * **CloudFront Invalidation Paths:**
 * - Platform only: `/api/v1/platforms/{platform}/*`
 * - Platform + Environment: `/api/v1/platforms/{platform}/environments/{environment}/*`
 * - Specific Version: `/api/v1/platforms/{platform}/environments/{environment}/versions/{version}/*`
 *
 * **Performance:**
 * - CloudFront invalidation: Typically completes in 10-30 seconds
 * - Cloudflare invalidation: Typically completes in 1-5 seconds
 * - Granular invalidation is faster and cheaper than global invalidation
 *
 * **Use Cases:**
 * - After deploying new configuration version (invalidate specific version)
 * - After updating feature flag (invalidate environment)
 * - After platform-wide changes (invalidate platform)
 * - During CI/CD deployment pipeline (automated invalidation)
 *
 * @throws {Error} If cache invalidation API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * // Invalidate specific configuration version
 * const result1 = await invalidateCacheAction('web', 'production', '1.2.3');
 * if (result1.success) {
 *   console.log('Cache invalidated:', result1.data);
 * }
 *
 * // Invalidate all versions in production environment
 * const result2 = await invalidateCacheAction('web', 'production');
 *
 * // Invalidate entire platform
 * const result3 = await invalidateCacheAction('web');
 *
 * // After deploying new config in CI/CD pipeline
 * await deployConfiguration('web', 'production', '1.2.3', config);
 * await invalidateCacheAction('web', 'production', '1.2.3');
 * ```
 */
export async function invalidateCacheAction(
  platform?: string,
  environment?: string,
  version?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const result = await invalidateCacheApi(platform, environment, version);

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to invalidate cache';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Invalidates all cached responses across all platforms and environments.
 *
 * @returns Promise resolving to invalidation result with success status and data/error
 *
 * @remarks
 * **Warning:**
 * Global cache invalidation is an expensive operation that:
 * - Invalidates ALL cached API responses across all platforms
 * - May cause temporary increased load on the backend API
 * - Costs more than granular invalidation (CloudFront charges per invalidation path)
 * - Takes longer to complete (typically 30-60 seconds for CloudFront)
 *
 * **When to Use:**
 * - After system-wide configuration changes
 * - After updating cache TTL or headers
 * - When debugging cache-related issues affecting multiple platforms
 * - During major system upgrades or migrations
 *
 * **When NOT to Use:**
 * - After deploying single configuration version (use invalidateCacheAction instead)
 * - After updating single feature flag (use invalidateCacheAction instead)
 * - During normal CI/CD deployments (use granular invalidation)
 *
 * **Performance Impact:**
 * - CloudFront: May take 30-60 seconds to complete globally
 * - Cloudflare: May take 5-15 seconds to propagate globally
 * - Backend may experience temporary 2-3x increase in cache-miss traffic
 *
 * **Best Practice:**
 * Prefer granular invalidation (invalidateCacheAction) whenever possible.
 * Use global invalidation only when truly necessary.
 *
 * @throws {Error} If cache invalidation API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * // Global cache invalidation (use sparingly)
 * const result = await invalidateAllCacheAction();
 * if (result.success) {
 *   console.log('All caches invalidated:', result.data);
 * } else {
 *   console.error('Invalidation failed:', result.error);
 * }
 *
 * // After system-wide cache configuration change
 * await updateCacheTTL(3600);
 * await invalidateAllCacheAction(); // Force all clients to get new TTL
 * ```
 */
export async function invalidateAllCacheAction(): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  try {
    const result = await invalidateAllCacheApi();

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to invalidate all caches';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
