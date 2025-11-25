import { Request, Response, NextFunction } from 'express';
import { logger, CloudFrontService } from '@togglebox/shared';
import { CacheProvider } from '@togglebox/cache';

/**
 * Controller handling webhook-compatible HTTP endpoints for CI/CD integration.
 *
 * Provides GET-based endpoints for cache invalidation and status checks
 * that can be easily integrated with deployment pipelines and CI/CD tools.
 *
 * @remarks
 * Uses GET requests instead of POST for webhook compatibility, even though
 * cache invalidation is a state-changing operation. This design choice enables
 * easier integration with CI/CD tools that may not support POST webhooks.
 */
export class WebhookController {
  private cacheProvider: CacheProvider;
  private cloudfrontService: CloudFrontService; // CloudFront-specific monitoring endpoints

  /**
   * Creates a new WebhookController instance with injected dependencies.
   *
   * @param cacheProvider - Cache provider instance (injected)
   *
   * @remarks
   * CloudFrontService is kept for getInvalidation and listInvalidations endpoints,
   * which are CloudFront-specific administrative/monitoring features not part of
   * the core CacheProvider interface.
   */
  constructor(cacheProvider: CacheProvider) {
    this.cacheProvider = cacheProvider;
    // CloudFront-specific service for monitoring/debugging endpoints
    this.cloudfrontService = new CloudFrontService();
  }

  /**
   * Invalidates CloudFront cache via webhook (GET request).
   *
   * @param req - Express request with query parameters (platform, environment, version, global)
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Query parameter combinations:
   * - `?global=true` - Invalidates all caches globally
   * - `?platform=X` - Invalidates all configurations for platform X
   * - `?platform=X&environment=Y` - Invalidates all versions in environment Y
   * - `?platform=X&environment=Y&version=Z` - Invalidates specific version Z
   *
   * @example
   * ```
   * GET /api/v1/internal/webhook/cache/invalidate?platform=my-app&environment=production
   * GET /api/v1/internal/webhook/cache/invalidate?global=true
   * ```
   *
   * @returns HTTP 200 with invalidation ID, paths, and scope, or 400 if parameters are invalid
   */
  invalidateCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, version, global: globalParam } = req.query;

      if (globalParam === 'true') {
        const invalidationId = await this.cacheProvider.invalidateGlobalCache();

        logger.logCloudFrontInvalidation(invalidationId, ['/*'], true);
        logger.info('Created global cache invalidation via webhook');

        res.json({
          success: true,
          data: {
            invalidationId,
            paths: ['/*'],
            scope: 'global',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!platform || typeof platform !== 'string') {
        res.status(422).json({
          success: false,
          error: 'Platform parameter is required when global is not true',
          code: 'VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let paths: string[];
      let scope: string;

      if (version && typeof version === 'string') {
        if (!environment || typeof environment !== 'string') {
          res.status(422).json({
            success: false,
            error: 'Environment parameter is required when version is specified',
            code: 'VALIDATION_FAILED',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        paths = this.cacheProvider.generateCachePaths(platform, environment, version);
        scope = `platform:${platform}/environment:${environment}/version:${version}`;
      } else if (environment && typeof environment === 'string') {
        paths = this.cacheProvider.generateCachePaths(platform, environment);
        scope = `platform:${platform}/environment:${environment}`;
      } else {
        paths = this.cacheProvider.generateCachePaths(platform);
        scope = `platform:${platform}`;
      }

      const invalidationId = await this.cacheProvider.invalidateCache(paths);

      logger.logCloudFrontInvalidation(invalidationId, paths, true);
      logger.info(`Created cache invalidation ${invalidationId || 'skipped'} via webhook for scope: ${scope}`);

      res.json({
        success: true,
        data: {
          invalidationId,
          paths,
          scope,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Webhook cache invalidation failed', error);
      next(error);
    }
  };

  /**
   * Retrieves the status of a CloudFront cache invalidation.
   *
   * @param req - Express request with invalidationId in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Returns invalidation details including status (InProgress or Completed),
   * creation time, and invalidated paths.
   *
   * @returns HTTP 200 with invalidation status and details, or 400 if ID is missing
   */
  getInvalidationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { invalidationId } = req.params;

      if (!invalidationId) {
        res.status(422).json({
          success: false,
          error: 'Invalidation ID is required',
          code: 'VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const invalidation = await this.cloudfrontService.getInvalidation(invalidationId);

      res.json({
        success: true,
        data: {
          invalidationId: invalidation.Id,
          status: invalidation.Status,
          createTime: invalidation.CreateTime,
          paths: invalidation.InvalidationBatch?.Paths?.Items || [],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get invalidation status', error);
      next(error);
    }
  };

  /**
   * Lists recent CloudFront cache invalidations.
   *
   * @param req - Express request with optional maxItems query parameter
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Supports pagination with `maxItems` query parameter.
   * Returns invalidation list with markers for pagination continuation.
   *
   * @example
   * ```
   * GET /api/v1/webhook/cache/invalidations?maxItems=10
   * ```
   *
   * @returns HTTP 200 with invalidation list and pagination metadata, or 400 if maxItems is invalid
   */
  listInvalidations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { maxItems } = req.query;
      const maxItemsNum = maxItems ? parseInt(maxItems as string, 10) : undefined;

      if (maxItemsNum && (isNaN(maxItemsNum) || maxItemsNum <= 0)) {
        res.status(422).json({
          success: false,
          error: 'maxItems must be a positive integer',
          code: 'VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const invalidationList = await this.cloudfrontService.listInvalidations(maxItemsNum);

      res.json({
        success: true,
        data: {
          invalidations: invalidationList.Items || [],
          isTruncated: invalidationList.IsTruncated,
          marker: invalidationList.Marker,
          nextMarker: invalidationList.NextMarker,
          maxItems: invalidationList.MaxItems,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to list invalidations', error);
      next(error);
    }
  };
}