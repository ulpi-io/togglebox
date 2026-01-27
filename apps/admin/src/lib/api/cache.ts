import { browserApiClient } from './browser-client';
import type { InvalidationStatus } from './types';

export interface CacheInvalidationResult {
  success: boolean;
  message: string;
  invalidatedPaths: string[];
}

/**
 * Response from listing cache invalidations.
 */
export interface CacheInvalidationListResult {
  invalidations: InvalidationStatus[];
  isTruncated: boolean;
  marker?: string;
  nextMarker?: string;
  maxItems?: number;
}

/**
 * Invalidate cache for specific platform/environment/version.
 */
export async function invalidateCacheApi(
  platform?: string,
  environment?: string,
  version?: string
): Promise<CacheInvalidationResult> {
  const body: Record<string, string> = {};
  if (platform) body.platform = platform;
  if (environment) body.environment = environment;
  if (version) body.version = version;

  return browserApiClient('/api/v1/internal/cache/invalidate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Invalidate all cache entries.
 */
export async function invalidateAllCacheApi(): Promise<CacheInvalidationResult> {
  return browserApiClient('/api/v1/internal/cache/invalidate-all', {
    method: 'POST',
  });
}

/**
 * Get list of recent cache invalidation operations.
 *
 * @param maxItems - Maximum number of items to return (default 10)
 * @returns List of invalidation operations with their status
 */
export async function getCacheInvalidationsApi(
  maxItems: number = 10
): Promise<CacheInvalidationListResult> {
  return browserApiClient<CacheInvalidationListResult>(
    `/api/v1/internal/webhook/cache/invalidations?maxItems=${maxItems}`
  );
}

/**
 * Get status of a specific cache invalidation operation.
 *
 * @param invalidationId - The ID of the invalidation to check
 * @returns Invalidation status details
 */
export async function getCacheInvalidationStatusApi(
  invalidationId: string
): Promise<InvalidationStatus> {
  return browserApiClient<InvalidationStatus>(
    `/api/v1/internal/webhook/cache/invalidations/${invalidationId}`
  );
}
