import { browserApiClient } from './browser-client';

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
  const body: Record<string, string> = {};
  if (platform) body.platform = platform;
  if (environment) body.environment = environment;
  if (version) body.version = version;

  return browserApiClient('/api/v1/internal/cache/invalidate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function invalidateAllCacheApi(): Promise<CacheInvalidationResult> {
  return browserApiClient('/api/v1/internal/cache/invalidate-all', {
    method: 'POST',
  });
}
