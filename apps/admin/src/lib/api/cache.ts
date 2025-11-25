import { apiClient } from './client';

export interface CacheInvalidationResult {
  success: boolean;
  message: string;
  invalidatedPaths: string[];
}

export async function invalidateCacheApi(
  platform?: string,
  environment?: string,
  version?: string
): Promise<CacheInvalidationResult> {
  const body: any = {};
  if (platform) body.platform = platform;
  if (environment) body.environment = environment;
  if (version) body.version = version;

  return apiClient('/api/v1/internal/cache/invalidate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function invalidateAllCacheApi(): Promise<CacheInvalidationResult> {
  return apiClient('/api/v1/internal/cache/invalidate-all', {
    method: 'POST',
  });
}
