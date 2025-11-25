import { CacheProvider } from '../types/CacheProvider';
import { logger } from '@togglebox/shared';

/**
 * No-Operation Cache Provider
 *
 * A cache provider that does nothing (disabled caching).
 * Used when caching is explicitly disabled or no cache configuration is provided.
 *
 * All methods return null and log a debug message.
 */
export class NoOpCacheProvider implements CacheProvider {
  /**
   * Cache is always disabled for NoOpCacheProvider
   */
  isEnabled(): boolean {
    return false;
  }

  /**
   * No-op cache invalidation
   */
  async invalidateCache(_paths: string[]): Promise<null> {
    logger.debug('Cache invalidation skipped (caching disabled)', { provider: 'noop' });
    return null;
  }

  /**
   * No-op global cache invalidation
   */
  async invalidateGlobalCache(): Promise<null> {
    logger.debug('Global cache invalidation skipped (caching disabled)', { provider: 'noop' });
    return null;
  }

  /**
   * No-op platform cache invalidation
   */
  async invalidatePlatformCache(_platform: string): Promise<null> {
    logger.debug('Platform cache invalidation skipped (caching disabled)', { provider: 'noop' });
    return null;
  }

  /**
   * No-op environment cache invalidation
   */
  async invalidateEnvironmentCache(_platform: string, _environment: string): Promise<null> {
    logger.debug('Environment cache invalidation skipped (caching disabled)', { provider: 'noop' });
    return null;
  }

  /**
   * No-op version cache invalidation
   */
  async invalidateVersionCache(_platform: string, _environment: string, _version: string): Promise<null> {
    logger.debug('Version cache invalidation skipped (caching disabled)', { provider: 'noop' });
    return null;
  }

  /**
   * No-op feature flag cache invalidation
   */
  async invalidateFeatureFlagCache(_platform: string, _environment: string, _flagName: string): Promise<null> {
    logger.debug('Feature flag cache invalidation skipped (caching disabled)', { provider: 'noop' });
    return null;
  }

  /**
   * Generate cache paths (returns empty array)
   */
  generateCachePaths(_platform?: string, _environment?: string, _version?: string): string[] {
    return [];
  }
}
