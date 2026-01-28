/**
 * AWS CloudFront cache invalidation service.
 *
 * @module cloudfront
 *
 * @remarks
 * This module provides CloudFront-specific monitoring and status endpoints.
 * For cache invalidation operations, use the `@togglebox/cache` package which
 * provides a unified interface across multiple CDN providers.
 *
 * **CloudFront-Specific Features:**
 * - Get invalidation status
 * - List recent invalidations
 * - Generate cache paths for invalidation
 *
 * **Authentication:**
 * Uses AWS SDK credentials from environment or IAM roles:
 * - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (development)
 * - IAM role (production - recommended)
 *
 * **Environment Variables:**
 * - `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID (required)
 * - `AWS_REGION` - AWS region (default: us-east-1)
 */

import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListInvalidationsCommand,
} from "@aws-sdk/client-cloudfront";
import type {
  Invalidation,
  InvalidationList,
} from "@aws-sdk/client-cloudfront";

/**
 * Service for managing AWS CloudFront cache invalidations.
 *
 * Provides methods to invalidate CloudFront caches at various levels of granularity
 * (global, platform, environment, version) and query invalidation status.
 *
 * @remarks
 * Requires AWS credentials and a CloudFront distribution ID to be configured
 * via environment variables (CLOUDFRONT_DISTRIBUTION_ID, AWS_REGION).
 */
export class CloudFrontService {
  private cloudfront: CloudFrontClient;
  private distributionId: string;

  /**
   * Creates a new CloudFrontService instance.
   *
   * @param distributionId - CloudFront distribution ID (defaults to CLOUDFRONT_DISTRIBUTION_ID env var)
   *
   * @throws {Error} If distribution ID is not provided and environment variable is not set
   */
  constructor(
    distributionId: string = process.env["CLOUDFRONT_DISTRIBUTION_ID"] || "",
  ) {
    this.distributionId = distributionId;
    this.cloudfront = new CloudFrontClient({
      region: process.env["AWS_REGION"] || "us-east-1",
    });
  }

  /**
   * Creates a CloudFront cache invalidation for specified paths.
   *
   * @param paths - Array of paths to invalidate (e.g., ['/platforms/my-app/*'])
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @throws {Error} If distribution ID is not configured
   * @throws {Error} If paths array is empty
   * @throws {Error} If CloudFront API call fails
   *
   * @remarks
   * Uses a unique caller reference (timestamp + random string) to identify each invalidation request.
   * CloudFront invalidations are asynchronous - use getInvalidation() to check status.
   */
  async invalidateCache(paths: string[]): Promise<string> {
    if (!this.distributionId) {
      throw new Error("CloudFront distribution ID is not configured");
    }

    if (paths.length === 0) {
      throw new Error("At least one path must be specified for invalidation");
    }

    const params = {
      DistributionId: this.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
        CallerReference: `invalidation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    try {
      const result = await this.cloudfront.send(
        new CreateInvalidationCommand(params),
      );
      return result.Invalidation?.Id || "";
    } catch (error) {
      throw new Error(`Failed to create CloudFront invalidation: ${error}`);
    }
  }

  /**
   * Invalidates all CloudFront caches globally.
   *
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates all cached content across the entire distribution (path: /*)
   */
  async invalidateGlobalCache(): Promise<string> {
    return this.invalidateCache(["/*"]);
  }

  /**
   * Invalidates all CloudFront caches for a specific platform.
   *
   * @param platform - Platform name
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates all environments and versions under the specified platform.
   */
  async invalidatePlatformCache(platform: string): Promise<string> {
    return this.invalidateCache([`/platforms/${platform}/*`]);
  }

  /**
   * Invalidates all CloudFront caches for a specific environment.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates all configuration versions within the specified environment.
   */
  async invalidateEnvironmentCache(
    platform: string,
    environment: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for a specific configuration version.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param version - Version identifier
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates both the exact version path and all subpaths under it.
   */
  async invalidateVersionCache(
    platform: string,
    environment: string,
    version: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/versions/${version}`,
      `/platforms/${platform}/environments/${environment}/versions/${version}/*`,
    ]);
  }

  /**
   * Invalidates all CloudFront caches for feature flags in an environment.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates all feature flags within the specified environment.
   * Useful when multiple flags have been updated or when deploying flag changes.
   */
  async invalidateAllFlagsCache(
    platform: string,
    environment: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/flags/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for a specific feature flag.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param flagKey - Feature flag key
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates the specific feature flag endpoint.
   * Should be called when a flag is toggled or updated.
   */
  async invalidateFlagCache(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/flags/${flagKey}`,
      `/platforms/${platform}/environments/${environment}/flags/${flagKey}/*`,
    ]);
  }

  /**
   * Invalidates all CloudFront caches for experiments in an environment.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates all experiments within the specified environment.
   */
  async invalidateAllExperimentsCache(
    platform: string,
    environment: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/experiments/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for a specific experiment.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @param experimentKey - Experiment key
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates the specific experiment endpoint.
   */
  async invalidateExperimentCache(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
      `/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/*`,
    ]);
  }

  /**
   * Invalidates CloudFront cache for stats endpoints in an environment.
   *
   * @param platform - Platform name
   * @param environment - Environment name
   * @returns Promise resolving to the CloudFront invalidation ID
   *
   * @remarks
   * Invalidates all stats endpoints within the specified environment.
   */
  async invalidateStatsCache(
    platform: string,
    environment: string,
  ): Promise<string> {
    return this.invalidateCache([
      `/platforms/${platform}/environments/${environment}/*/stats`,
      `/platforms/${platform}/environments/${environment}/*/stats/*`,
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
   * @throws {Error} If invalid parameter combination is provided
   *
   * @remarks
   * Valid parameter combinations:
   * - No params: Global invalidation (/*)
   * - platform only: /platforms/{platform}/*
   * - platform + environment: /platforms/{platform}/environments/{environment}/*
   * - platform + environment + version: Specific version paths
   *
   * Invalid: environment without platform, or version without environment
   */
  generateCachePaths(
    platform?: string,
    environment?: string,
    version?: string,
  ): string[] {
    const paths: string[] = [];

    if (!platform && !environment && !version) {
      paths.push("/*");
      return paths;
    }

    if (platform && !environment && !version) {
      paths.push(`/platforms/${platform}/*`);
      return paths;
    }

    if (platform && environment && !version) {
      paths.push(`/platforms/${platform}/environments/${environment}/*`);
      return paths;
    }

    if (platform && environment && version) {
      paths.push(
        `/platforms/${platform}/environments/${environment}/versions/${version}`,
      );
      paths.push(
        `/platforms/${platform}/environments/${environment}/versions/${version}/*`,
      );
      return paths;
    }

    throw new Error(
      "Invalid combination of platform, environment, and version parameters",
    );
  }

  /**
   * Retrieves the status and details of a CloudFront invalidation.
   *
   * @param invalidationId - The CloudFront invalidation ID
   * @returns Promise resolving to invalidation details
   *
   * @throws {Error} If distribution ID is not configured
   * @throws {Error} If CloudFront API call fails
   *
   * @remarks
   * Returns invalidation status (InProgress or Completed), creation time, and invalidated paths.
   */
  async getInvalidation(invalidationId: string): Promise<Invalidation> {
    if (!this.distributionId) {
      throw new Error("CloudFront distribution ID is not configured");
    }

    const params = {
      DistributionId: this.distributionId,
      Id: invalidationId,
    };

    try {
      const result = await this.cloudfront.send(
        new GetInvalidationCommand(params),
      );
      return result.Invalidation as Invalidation;
    } catch (error) {
      throw new Error(`Failed to get CloudFront invalidation: ${error}`);
    }
  }

  /**
   * Lists recent CloudFront cache invalidations for this distribution.
   *
   * @param maxItems - Optional maximum number of invalidations to return
   * @returns Promise resolving to invalidation list with pagination metadata
   *
   * @throws {Error} If distribution ID is not configured
   * @throws {Error} If CloudFront API call fails
   *
   * @remarks
   * Supports pagination via maxItems parameter and returned markers.
   * Returns most recent invalidations first.
   */
  async listInvalidations(maxItems?: number): Promise<InvalidationList> {
    if (!this.distributionId) {
      throw new Error("CloudFront distribution ID is not configured");
    }

    const params = {
      DistributionId: this.distributionId,
      MaxItems: maxItems,
    };

    try {
      const result = await this.cloudfront.send(
        new ListInvalidationsCommand(params),
      );
      return result.InvalidationList as InvalidationList;
    } catch (error) {
      throw new Error(`Failed to list CloudFront invalidations: ${error}`);
    }
  }
}
