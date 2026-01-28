import { CacheProvider } from '../types/CacheProvider';
import { logger } from '@togglebox/shared';

/**
 * Cloudflare Cache Provider
 *
 * Implements cache purge using Cloudflare's API.
 * Requires Cloudflare Zone ID and API Token.
 *
 * @see https://developers.cloudflare.com/api/operations/zone-purge
 */
export class CloudflareCacheProvider implements CacheProvider {
  private zoneId: string;
  private apiToken: string;
  private baseOrigin: string;
  private enabled: boolean;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  /**
   * Creates a new CloudflareCacheProvider instance.
   *
   * @param zoneId - Cloudflare Zone ID
   * @param apiToken - Cloudflare API Token with cache purge permission
   * @param baseOrigin - Base origin URL (e.g., 'https://api.example.com') - required for purge by URL
   */
  constructor(zoneId?: string, apiToken?: string, baseOrigin?: string) {
    this.zoneId = zoneId || '';
    this.apiToken = apiToken || '';
    this.baseOrigin = baseOrigin || '';
    // baseOrigin is required for purge by URL to work correctly
    this.enabled = !!(this.zoneId && this.apiToken && this.baseOrigin);
  }

  /**
   * Check if Cloudflare cache purge is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Purge Cloudflare cache for specific URLs.
   *
   * @param paths - Array of URL paths to purge (e.g., ['/api/v1/platforms/*'])
   * @returns Promise resolving to purge ID or null if disabled
   *
   * @remarks
   * Cloudflare supports two purge methods:
   * 1. Purge by URL (used here) - Max 30 URLs per request
   * 2. Purge everything - Purges all cache
   *
   * Wildcards (*) are not natively supported, so we purge common patterns.
   */
  async invalidateCache(paths: string[]): Promise<string | null> {
    if (!this.enabled) {
      logger.warn('Cache purge skipped: zone ID, API token, or base origin not configured', { provider: 'cloudflare' });
      return null;
    }

    if (paths.length === 0) {
      throw new Error('At least one path must be specified for cache purge');
    }

    // Cloudflare doesn't support wildcards in purge by URL
    // If global wildcard, purge everything
    if (paths.includes('/*')) {
      return this.purgeEverything();
    }

    // Convert paths to full URLs (Cloudflare requires full URLs, not just paths)
    const urls = paths.map((path) => {
      // Remove trailing wildcards (not supported by Cloudflare)
      const cleanPath = path.replace(/\/\*$/, '');
      // Construct full URL using baseOrigin
      return new URL(cleanPath, this.baseOrigin).toString();
    });

    // Cloudflare limits purge-by-URL to 30 URLs per request
    const MAX_URLS_PER_BATCH = 30;
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += MAX_URLS_PER_BATCH) {
      batches.push(urls.slice(i, i + MAX_URLS_PER_BATCH));
    }

    try {
      const purgeIds: string[] = [];

      for (const batch of batches) {
        const response = await fetch(`${this.baseUrl}/zones/${this.zoneId}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: batch,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Cloudflare cache purge failed: ${response.status} ${error}`);
        }

        const result = await response.json() as { success: boolean; result?: { id: string } };

        if (!result.success) {
          throw new Error('Cloudflare cache purge returned success: false');
        }

        if (result.result?.id) {
          purgeIds.push(result.result.id);
        }
      }

      const purgeId = purgeIds[0] || `purge-${Date.now()}`;
      logger.info('Cache purged successfully', {
        provider: 'cloudflare',
        purgeId,
        pathCount: paths.length,
        batchCount: batches.length
      });
      return purgeId;
    } catch (error) {
      throw new Error(`Failed to purge Cloudflare cache: ${error}`);
    }
  }

  /**
   * Purge all Cloudflare cache globally.
   */
  async invalidateGlobalCache(): Promise<string | null> {
    return this.purgeEverything();
  }

  /**
   * Purge Cloudflare cache for a specific platform.
   */
  async invalidatePlatformCache(platform: string): Promise<string | null> {
    return this.invalidateCache([`/api/v1/platforms/${platform}/*`]);
  }

  /**
   * Purge Cloudflare cache for a specific environment.
   */
  async invalidateEnvironmentCache(platform: string, environment: string): Promise<string | null> {
    return this.invalidateCache([`/api/v1/platforms/${platform}/environments/${environment}/*`]);
  }

  /**
   * Purge Cloudflare cache for a specific version.
   */
  async invalidateVersionCache(platform: string, environment: string, version: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/versions/${version}`,
    ]);
  }

  /**
   * Purge Cloudflare cache for a specific flag.
   */
  async invalidateFlagCache(platform: string, environment: string, flagKey: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}`,
    ]);
  }

  /**
   * Purge Cloudflare cache for a specific experiment.
   */
  async invalidateExperimentCache(platform: string, environment: string, experimentKey: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
    ]);
  }

  /**
   * Purge Cloudflare cache for all experiments in an environment.
   */
  async invalidateAllExperimentsCache(platform: string, environment: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/*`,
    ]);
  }

  /**
   * Purge Cloudflare cache for stats endpoints in an environment.
   */
  async invalidateStatsCache(platform: string, environment: string): Promise<string | null> {
    // Cloudflare doesn't support wildcards in the middle of paths, so enumerate known stats endpoints
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/flags/stats`,
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/stats`,
      `/api/v1/platforms/${platform}/environments/${environment}/configs/stats`,
      `/api/v1/platforms/${platform}/environments/${environment}/stats`,
    ]);
  }

  /**
   * Generate cache paths (same as CloudFront for consistency).
   */
  generateCachePaths(platform?: string, environment?: string, version?: string): string[] {
    const paths: string[] = [];

    if (!platform && !environment && !version) {
      paths.push('/*');
      return paths;
    }

    if (platform && !environment && !version) {
      paths.push(`/api/v1/platforms/${platform}/*`);
      return paths;
    }

    if (platform && environment && !version) {
      paths.push(`/api/v1/platforms/${platform}/environments/${environment}/*`);
      return paths;
    }

    if (platform && environment && version) {
      paths.push(`/api/v1/platforms/${platform}/environments/${environment}/versions/${version}`);
      paths.push(`/api/v1/platforms/${platform}/environments/${environment}/versions/${version}/*`);
      return paths;
    }

    throw new Error('Invalid combination of platform, environment, and version parameters');
  }

  /**
   * Purge everything in the Cloudflare zone.
   * (Private helper method)
   */
  private async purgeEverything(): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/zones/${this.zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purge_everything: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare purge everything failed: ${response.status} ${error}`);
      }

      const result = await response.json() as { success: boolean; result?: { id: string } };

      if (!result.success) {
        throw new Error('Cloudflare purge everything returned success: false');
      }

      const purgeId = result.result?.id || `purge-all-${Date.now()}`;
      logger.info('All cache purged successfully', {
        provider: 'cloudflare',
        purgeId,
        scope: 'global'
      });
      return purgeId;
    } catch (error) {
      throw new Error(`Failed to purge all Cloudflare cache: ${error}`);
    }
  }
}
