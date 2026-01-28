import { CloudFrontClient, CreateInvalidationCommand, GetInvalidationCommand, ListInvalidationsCommand } from '@aws-sdk/client-cloudfront';
import type { Invalidation, InvalidationList } from '@aws-sdk/client-cloudfront';
import { CacheProvider } from '../types/CacheProvider';
import { logger } from '@togglebox/shared';

/**
 * AWS CloudFront Cache Provider
 *
 * Implements cache invalidation using AWS CloudFront distribution.
 * Requires AWS credentials and CloudFront distribution ID.
 */
export class CloudFrontCacheProvider implements CacheProvider {
  private cloudfront: CloudFrontClient;
  private distributionId: string;
  private enabled: boolean;

  /**
   * Creates a new CloudFrontCacheProvider instance.
   *
   * @param distributionId - CloudFront distribution ID
   * @param region - AWS region (default: us-east-1)
   *
   * @throws {Error} If distribution ID is not provided
   */
  constructor(distributionId?: string, region: string = 'us-east-1') {
    this.distributionId = distributionId || '';
    this.enabled = !!this.distributionId;

    this.cloudfront = new CloudFrontClient({
      region,
    });
  }

  /**
   * Check if CloudFront cache invalidation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Creates a CloudFront cache invalidation for specified paths.
   *
   * @param paths - Array of paths to invalidate (e.g., ['/api/v1/platforms/*'])
   * @returns Promise resolving to the CloudFront invalidation ID or null if disabled
   */
  async invalidateCache(paths: string[]): Promise<string | null> {
    if (!this.enabled) {
      logger.warn('Cache invalidation skipped: distribution ID not configured', { provider: 'cloudfront' });
      return null;
    }

    if (paths.length === 0) {
      throw new Error('At least one path must be specified for invalidation');
    }

    // CloudFront limits invalidations to 1000 paths per request
    const MAX_PATHS_PER_BATCH = 1000;
    const batches: string[][] = [];
    for (let i = 0; i < paths.length; i += MAX_PATHS_PER_BATCH) {
      batches.push(paths.slice(i, i + MAX_PATHS_PER_BATCH));
    }

    try {
      const invalidationIds: string[] = [];

      for (const batch of batches) {
        const params = {
          DistributionId: this.distributionId,
          InvalidationBatch: {
            Paths: {
              Quantity: batch.length,
              Items: batch,
            },
            CallerReference: `invalidation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
        };

        const result = await this.cloudfront.send(new CreateInvalidationCommand(params));
        if (result.Invalidation?.Id) {
          invalidationIds.push(result.Invalidation.Id);
        }
      }

      const invalidationId = invalidationIds[0] || '';
      logger.info('Cache invalidated successfully', {
        provider: 'cloudfront',
        invalidationId,
        pathCount: paths.length,
        batchCount: batches.length
      });
      return invalidationId;
    } catch (error) {
      throw new Error(`Failed to create CloudFront invalidation: ${error}`);
    }
  }

  /**
   * Invalidates all CloudFront caches globally.
   */
  async invalidateGlobalCache(): Promise<string | null> {
    return this.invalidateCache(['/*']);
  }

  /**
   * Invalidates all CloudFront caches for a specific platform.
   */
  async invalidatePlatformCache(platform: string): Promise<string | null> {
    return this.invalidateCache([`/api/v1/platforms/${platform}/*`]);
  }

  /**
   * Invalidates all CloudFront caches for a specific environment.
   */
  async invalidateEnvironmentCache(platform: string, environment: string): Promise<string | null> {
    return this.invalidateCache([`/api/v1/platforms/${platform}/environments/${environment}/*`]);
  }

  /**
   * Invalidates CloudFront cache for a specific configuration version.
   */
  async invalidateVersionCache(platform: string, environment: string, version: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/versions/${version}`,
      `/api/v1/platforms/${platform}/environments/${environment}/versions/${version}/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for a specific flag.
   */
  async invalidateFlagCache(platform: string, environment: string, flagKey: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}`,
      `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for a specific experiment.
   */
  async invalidateExperimentCache(platform: string, environment: string, experimentKey: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for all experiments in an environment.
   */
  async invalidateAllExperimentsCache(platform: string, environment: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for stats endpoints in an environment.
   */
  async invalidateStatsCache(platform: string, environment: string): Promise<string | null> {
    return this.invalidateCache([
      `/api/v1/platforms/${platform}/environments/${environment}/*/stats`,
      `/api/v1/platforms/${platform}/environments/${environment}/*/stats/*`,
    ]);
  }

  /**
   * Generates CloudFront cache paths based on provided parameters.
   *
   * @param platform - Optional platform name
   * @param environment - Optional environment name
   * @param version - Optional version identifier
   * @returns Array of CloudFront paths to invalidate
   *
   * @remarks
   * Valid parameter combinations:
   * - No params: Global invalidation (/*)
   * - platform only: /api/v1/platforms/{platform}/*
   * - platform + environment: /api/v1/platforms/{platform}/environments/{environment}/*
   * - platform + environment + version: Specific version paths
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
   * Retrieves the status and details of a CloudFront invalidation.
   * (Additional method not in CacheProvider interface)
   */
  async getInvalidation(invalidationId: string): Promise<Invalidation> {
    if (!this.enabled) {
      throw new Error('CloudFront distribution ID is not configured');
    }

    const params = {
      DistributionId: this.distributionId,
      Id: invalidationId,
    };

    try {
      const result = await this.cloudfront.send(new GetInvalidationCommand(params));
      return result.Invalidation as Invalidation;
    } catch (error) {
      throw new Error(`Failed to get CloudFront invalidation: ${error}`);
    }
  }

  /**
   * Lists recent CloudFront cache invalidations for this distribution.
   * (Additional method not in CacheProvider interface)
   */
  async listInvalidations(maxItems?: number): Promise<InvalidationList> {
    if (!this.enabled) {
      throw new Error('CloudFront distribution ID is not configured');
    }

    const params = {
      DistributionId: this.distributionId,
      ...(maxItems && { MaxItems: maxItems }),
    };

    try {
      const result = await this.cloudfront.send(new ListInvalidationsCommand(params));
      return result.InvalidationList as InvalidationList;
    } catch (error) {
      throw new Error(`Failed to list CloudFront invalidations: ${error}`);
    }
  }
}
