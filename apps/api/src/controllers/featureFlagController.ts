import { Request, Response, NextFunction } from 'express';
import { DatabaseRepositories, withDatabaseContext } from '@togglebox/database';
import { logger, getTokenPaginationParams, createPaginationMeta } from '@togglebox/shared';
import { CreateFeatureFlagSchema, UpdateFeatureFlagSchema, ToggleFeatureFlagSchema, EvaluateFeatureFlagRequestSchema, evaluateFeatureFlag, evaluateMultipleFeatureFlags } from '@togglebox/core';
import { CacheProvider } from '@togglebox/cache';
import { z } from 'zod';

/**
 * Controller handling all feature flag-related HTTP requests.
 *
 * Manages CRUD operations for feature flags within platform environments.
 * Feature flags are mutable toggles (unlike immutable configs) designed for runtime control.
 *
 * @remarks
 * Feature flags allow applications to:
 * - Toggle features on/off without code deployment
 * - Test new features in production with instant rollback
 * - Gradually roll out features to users (Phase 2)
 * - A/B test different implementations (Phase 2)
 */
export class FeatureFlagController {
  private db: DatabaseRepositories;
  private cacheProvider: CacheProvider;

  /**
   * Creates a new FeatureFlagController instance with injected dependencies.
   *
   * @param db - Database repositories instance (injected)
   * @param cacheProvider - Cache provider instance (injected)
   */
  constructor(db: DatabaseRepositories, cacheProvider: CacheProvider) {
    this.db = db;
    this.cacheProvider = cacheProvider;
  }

  /**
   * Creates a new feature flag.
   *
   * @param req - Express request containing feature flag data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Request body must include:
   * - platform: Platform identifier
   * - environment: Environment name
   * - flagName: Unique flag identifier
   * - enabled: Boolean toggle state (defaults to false)
   * - description: Optional human-readable description
   * - createdBy: Creator email
   *
   * **Cache Invalidation:**
   * Automatically invalidates CloudFront cache for the specific flag and list endpoints.
   * Feature flags are frequently accessed, so cache invalidation ensures immediate visibility.
   *
   * @throws {ZodError} If request body validation fails
   * @returns HTTP 201 with created feature flag data, or 400 if validation fails
   */
  createFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = CreateFeatureFlagSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const featureFlag = await this.db.featureFlag.createFeatureFlag(validatedData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('createFeatureFlag', 'feature-flags', duration, true);
        logger.info(`Created feature flag ${featureFlag.flagName} for platform ${featureFlag.platform} and environment ${featureFlag.environment}`);

        // Invalidate cache for specific flag and list endpoints
        const cachePaths = [
          `/api/v1/platforms/${featureFlag.platform}/environments/${featureFlag.environment}/feature-flags/${featureFlag.flagName}`,
          `/api/v1/platforms/${featureFlag.platform}/environments/${featureFlag.environment}/feature-flags`,
        ];

        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          logger.error('Cache invalidation failed (non-blocking)', err);
        });

        res.status(201).json({
          success: true,
          data: featureFlag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Retrieves a specific feature flag.
   *
   * @param req - Express request with platform, environment, flagName in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with feature flag data, or 404 if not found
   */
  getFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagName } = req.params as { platform: string; environment: string; flagName: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.featureFlag.getFeatureFlag(platform, environment, flagName);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFeatureFlag', 'feature-flags', duration, true);

        if (!result) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lists all feature flags for an environment.
   *
   * Supports pagination via query parameters:
   * - ?page=1&perPage=20 (page-based pagination)
   * - ?limit=20&offset=0 (offset-based pagination)
   *
   * @param req - Express request with platform, environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with paginated array of feature flags
   *
   * @remarks
   * Returns all feature flags (enabled and disabled) for the environment.
   */
  listFeatureFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      // Get pagination params (undefined if not explicitly requested)
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.featureFlag.listFeatureFlags(platform, environment, pagination);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listFeatureFlags', 'feature-flags', duration, true);

        // Handle both offset-based (SQL/MongoDB) and token-based (DynamoDB) pagination
        if ('total' in result && result.total !== undefined) {
          // Has total count: either all items fetched or offset-based pagination
          if (pagination) {
            // Paginated response
            const paginationMeta = createPaginationMeta(1, pagination.limit, result.total);
            res.json({
              success: true,
              data: result.items,
              meta: paginationMeta,
              timestamp: new Date().toISOString(),
            });
          } else {
            // All items returned (no pagination requested)
            res.json({
              success: true,
              data: result.items,
              meta: {
                total: result.total,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          // Token-based pagination (DynamoDB) - single page
          res.json({
            success: true,
            data: result.items,
            meta: {
              nextToken: result.nextToken,
              hasMore: !!result.nextToken,
            },
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates an existing feature flag.
   *
   * @param req - Express request with platform, environment, flagName in params and update data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Supports partial updates of flag fields (enabled, description, etc.).
   * Automatically sets `updatedAt` timestamp.
   * Unlike configs, feature flags are mutable and can be updated in place.
   *
   * **Cache Invalidation:**
   * Automatically invalidates CloudFront cache for the specific flag endpoint.
   * This ensures applications immediately see the updated flag state.
   *
   * @throws {ZodError} If request body validation fails
   * @returns HTTP 200 with updated feature flag data, 404 if not found, or 400 if validation fails
   */
  updateFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagName } = req.params as { platform: string; environment: string; flagName: string };
      const validatedData = UpdateFeatureFlagSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const updatedFlag = await this.db.featureFlag.updateFeatureFlag(platform, environment, flagName, validatedData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updateFeatureFlag', 'feature-flags', duration, true);

        if (!updatedFlag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Updated feature flag ${flagName} for platform ${platform} and environment ${environment}`);

        // Invalidate cache for specific flag endpoint
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/feature-flags/${flagName}`,
        ];

        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          logger.error('Cache invalidation failed (non-blocking)', err);
        });

        res.json({
          success: true,
          data: updatedFlag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Deletes a feature flag.
   *
   * @param req - Express request with platform, environment, flagName in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Checks if the flag exists before attempting deletion to provide proper 404 response.
   *
   * **Cache Invalidation:**
   * Automatically invalidates CloudFront cache for the specific flag and list endpoints.
   * This ensures applications no longer see the deleted flag.
   *
   * @returns HTTP 200 with success message, or 404 if not found
   */
  deleteFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagName } = req.params as { platform: string; environment: string; flagName: string };

      await withDatabaseContext(req, async () => {
        // Check if flag exists before deleting
        const existingFlag = await this.db.featureFlag.getFeatureFlag(platform, environment, flagName);

        if (!existingFlag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const startTime = Date.now();
        await this.db.featureFlag.deleteFeatureFlag(platform, environment, flagName);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('deleteFeatureFlag', 'feature-flags', duration, true);
        logger.info(`Deleted feature flag ${flagName} for platform ${platform} and environment ${environment}`);

        // Invalidate cache for specific flag and list endpoints
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/feature-flags/${flagName}`,
          `/api/v1/platforms/${platform}/environments/${environment}/feature-flags`,
        ];

        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          logger.error('Cache invalidation failed (non-blocking)', err);
        });

        // HTTP 204 No Content - successful DELETE with no response body
        res.status(204).send();
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Toggles a feature flag's enabled state (convenience endpoint).
   *
   * @param req - Express request with platform, environment, flagName in params and { enabled: boolean } in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Convenience endpoint for quickly enabling/disabling a feature flag.
   * Equivalent to PATCH with { enabled: true/false } but more explicit.
   *
   * **Cache Invalidation:**
   * Automatically invalidates CloudFront cache for the specific flag endpoint.
   * This ensures applications immediately see the toggled flag state.
   *
   * @throws {ZodError} If request body validation fails
   * @returns HTTP 200 with updated feature flag data, 404 if not found, or 400 if validation fails
   */
  toggleFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagName } = req.params as { platform: string; environment: string; flagName: string };
      const { enabled } = ToggleFeatureFlagSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const updatedFlag = await this.db.featureFlag.updateFeatureFlag(platform, environment, flagName, { enabled });
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('toggleFeatureFlag', 'feature-flags', duration, true);

        if (!updatedFlag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Toggled feature flag ${flagName} to ${enabled} for platform ${platform} and environment ${environment}`);

        // Invalidate cache for specific flag endpoint
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/feature-flags/${flagName}`,
        ];

        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          logger.error('Cache invalidation failed (non-blocking)', err);
        });

        res.json({
          success: true,
          data: updatedFlag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Evaluates ALL feature flags for a user.
   *
   * @param req - Express request with platform, environment in params and context in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Called at app initialization to fetch all flags with evaluation results.
   *
   * **Request body (all optional):**
   * - userId: Required for phased rollout flags
   * - country: Required if flag has country targeting
   * - language: Required if flag has language targeting
   *
   * **Graceful degradation:**
   * Missing context fields result in flags being disabled with helpful reason.
   *
   * @returns HTTP 200 with evaluation results for all flags
   */
  evaluateAllFeatureFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const validatedContext = EvaluateFeatureFlagRequestSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        // Fetch ALL flags in single query (no pagination)
        const flags = await this.db.featureFlag.listFeatureFlags(platform, environment);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listFeatureFlags', 'feature-flags', duration, true);
        const evaluations = evaluateMultipleFeatureFlags(flags, validatedContext);

        logger.info(`Evaluated ${flags.length} flags for platform ${platform}/${environment}`);

        res.json({
          success: true,
          data: evaluations,
          count: Object.keys(evaluations).length,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Evaluates a SINGLE feature flag for a user.
   *
   * @param req - Express request with platform, environment, flagName in params and context in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Called on-demand during user journey for flags not fetched at initialization.
   *
   * **Request body (all optional):**
   * - userId: Required for phased rollout flags
   * - country: Required if flag has country targeting
   * - language: Required if flag has language targeting
   *
   * @returns HTTP 200 with evaluation result for single flag, or 404 if not found
   */
  evaluateSingleFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagName } = req.params as { platform: string; environment: string; flagName: string };
      const validatedContext = EvaluateFeatureFlagRequestSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.db.featureFlag.getFeatureFlag(platform, environment, flagName);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFeatureFlag', 'feature-flags', duration, true);

        if (!flag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const evaluation = evaluateFeatureFlag(flag, validatedContext);

        logger.info(`Evaluated flag ${flagName} for platform ${platform}/${environment}`);

        res.json({
          success: true,
          data: {
            flagName,
            ...evaluation,
          },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
}
