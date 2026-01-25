import { Request, Response, NextFunction } from 'express';
import { DatabaseRepositories } from '@togglebox/database';
import { logger, withDatabaseContext, getTokenPaginationParams, createPaginationMeta } from '@togglebox/shared';
import { CacheProvider } from '@togglebox/cache';
import { z } from 'zod';
import { Version, CacheInvalidationSchema } from '@togglebox/configs';

/**
 * Zod schema for platform creation validation
 */
const CreatePlatformSchema = z.object({
  name: z.string()
    .min(1, 'Platform name is required')
    .max(100, 'Platform name must be 100 characters or less')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Platform name can only contain letters, numbers, hyphens, and underscores'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

/**
 * Zod schema for version creation body validation.
 * Platform, environment, and createdBy are extracted from URL params and JWT token.
 */
const CreateVersionBodySchema = z.object({
  version: z.string()
    .min(1, 'Version is required')
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  config: z.record(z.unknown()),
  isStable: z.boolean().optional().default(false),
});

/**
 * Controller handling all configuration-related HTTP requests.
 *
 * Manages CRUD operations for platforms, environments, and configuration versions.
 * Supports multiple database backends via the factory pattern.
 *
 * @remarks
 * This controller handles the three-level hierarchy:
 * - Platform: Logical application/service identifier
 * - Environment: Deployment environment (dev, staging, production)
 * - Version: Versioned configuration with stability tracking
 */
export class ConfigController {
  private db: DatabaseRepositories;
  private cacheProvider: CacheProvider;

  /**
   * Creates a new ConfigController instance with injected dependencies.
   *
   * @param db - Database repositories instance (injected)
   * @param cacheProvider - Cache provider instance (injected)
   */
  constructor(db: DatabaseRepositories, cacheProvider: CacheProvider) {
    this.db = db;
    this.cacheProvider = cacheProvider;
  }

  /**
   * Creates a new configuration version.
   *
   * @param req - Express request containing version data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Request body must include:
   * - platform: Platform identifier
   * - environment: Environment name
   * - isStable: Stability flag
   * - config: JSON configuration object (max 300KB)
   * - createdBy: Creator email
   * - versionLabel: (Optional) User-friendly version name (e.g., "v1.0.0")
   *
   * **Auto-Generated Fields:**
   * - versionTimestamp: ISO-8601 timestamp (returned in response)
   * - createdAt: Same as versionTimestamp
   *
   * **Cache Invalidation:**
   * Automatically invalidates CloudFront cache for "latest" queries only.
   * Specific version paths are NOT invalidated (immutable, cached forever).
   *
   * @throws {ZodError} If request body validation fails
   * @returns HTTP 201 with created version data including versionTimestamp
   */
  createVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract platform and environment from URL params
      const { platform, environment } = req.params as { platform: string; environment: string };

      // Get createdBy from authenticated user (set by requireAuth middleware)
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      // Validate body fields only (platform, environment, createdBy come from params/user)
      const bodyData = CreateVersionBodySchema.parse(req.body);

      // Combine extracted values with body data
      const validatedData: Omit<Version, 'versionTimestamp' | 'createdAt'> = {
        platform,
        environment,
        createdBy,
        versionLabel: bodyData.version, // Map 'version' to 'versionLabel'
        config: bodyData.config as Version['config'],
        isStable: bodyData.isStable,
      };

      // Execute all database operations with correct table prefix from request context
      await withDatabaseContext(req, async () => {
        // NOTE: Platform/environment validation removed to avoid N+1 query pattern
        // The repository will validate via foreign key constraints
        // If platform or environment doesn't exist, create will fail with appropriate error

        const startTime = Date.now();
        const version = await this.db.config.createVersion(validatedData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('createVersion', 'configurations', duration, true);
        logger.info(`Created version ${version.versionTimestamp} (label: ${version.versionLabel || 'none'}) for platform ${version.platform} and environment ${version.environment}`);

        // Invalidate "latest" query caches only (specific version paths remain cached)
        const cachePaths = [
          `/api/v1/platforms/${version.platform}/environments/${version.environment}/versions`,
          `/api/v1/platforms/${version.platform}/environments/${version.environment}/versions/latest`,
          `/api/v1/platforms/${version.platform}/environments/${version.environment}/versions/latest/stable`,
        ];

        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          logger.error('Cache invalidation failed (non-blocking)', err);
        });

        res.status(201).json({
          success: true,
          data: version,
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
   * Retrieves a specific configuration version.
   *
   * @param req - Express request with platform, environment, version in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * The version parameter is the semantic version label (e.g., "1.0.0").
   *
   * @returns HTTP 200 with version data, or 404 if not found
   */
  getVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, version } = req.params as { platform: string; environment: string; version: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.config.getVersion(platform, environment, version);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getVersion', 'configurations', duration, true);

        if (!result) {
          res.status(404).json({
            success: false,
            error: 'Version not found',
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
   * Retrieves the latest stable configuration version for an environment.
   *
   * @param req - Express request with platform, environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Queries for versions with `isStable: true` and returns the most recent one.
   * Commonly used by applications to fetch production-ready configuration.
   *
   * @returns HTTP 200 with latest stable version data, or 404 if none found
   */
  getLatestStableVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.config.getLatestStableVersion(platform, environment);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getLatestStableVersion', 'configurations', duration, true);

        if (!result) {
          res.status(404).json({
            success: false,
            error: 'No stable version found',
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
   * Lists all configuration versions for an environment.
   *
   * Supports pagination via query parameters:
   * - ?page=1&perPage=20 (page-based pagination)
   * - ?limit=20&offset=0 (offset-based pagination)
   *
   * @param req - Express request with platform, environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with paginated array of versions
   */
  listVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      // Get pagination params (undefined if not explicitly requested)
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.config.listVersions(platform, environment, pagination);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listVersions', 'configurations', duration, true);

        // Handle both offset-based (SQL/MongoDB) and token-based (DynamoDB) pagination
        if ('total' in result && result.total !== undefined) {
          // Has total count: either all items fetched or offset-based pagination
          if (pagination) {
            // Paginated response (SQL/MongoDB with explicit pagination)
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
          const tokenResult = result as { items: typeof result.items; nextToken?: string };
          res.json({
            success: true,
            data: result.items,
            meta: {
              nextToken: tokenResult.nextToken,
              hasMore: !!tokenResult.nextToken,
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
   * Deletes a configuration version.
   *
   * @param req - Express request with platform, environment, version in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * The version parameter is the semantic version label (e.g., "1.0.0").
   *
   * **Cache Invalidation:**
   * Automatically invalidates CloudFront cache for "latest" queries.
   * This ensures list and latest endpoints reflect the deletion.
   *
   * @returns HTTP 200 with success message, or 404 if not found
   */
  deleteVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, version } = req.params as { platform: string; environment: string; version: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const deleted = await this.db.config.deleteVersion(platform, environment, version);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('deleteVersion', 'configurations', duration, true);

        if (!deleted) {
          res.status(404).json({
            success: false,
            error: 'Version not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Deleted version ${version} for platform ${platform} and environment ${environment}`);

        // Invalidate "latest" query caches only (deletion affects aggregate queries)
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/versions`,
          `/api/v1/platforms/${platform}/environments/${environment}/versions/latest`,
          `/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`,
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
   * Marks a configuration version as stable.
   *
   * @param req - Express request with platform, environment, version in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @returns HTTP 200 with updated version, or 404 if not found
   */
  markVersionStable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, version } = req.params as { platform: string; environment: string; version: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.config.markVersionStable(platform, environment, version);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('markVersionStable', 'configurations', duration, true);

        if (!result) {
          res.status(404).json({
            success: false,
            error: 'Version not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Marked version ${version} as stable for platform ${platform} and environment ${environment}`);

        // Invalidate stable version cache
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`,
        ];

        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          logger.error('Cache invalidation failed (non-blocking)', err);
        });

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
   * Creates a new platform.
   *
   * @param req - Express request containing platform data in body (name, description)
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Platform is the top-level organization entity representing an application or service.
   *
   * @returns HTTP 201 with created platform data, or 400 if name is missing
   */
  createPlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = CreatePlatformSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const platform = await this.db.platform.createPlatform({
          name: validatedData.name,
          description: validatedData.description,
          createdAt: new Date().toISOString(),
        });

        logger.info(`Created platform ${validatedData.name}`);

        res.status(201).json({
          success: true,
          data: platform,
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
   * Retrieves a specific platform by name.
   *
   * @param req - Express request with platform name in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with platform data, or 404 if not found
   */
  getPlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params as { name: string };

      await withDatabaseContext(req, async () => {
        const platform = await this.db.platform.getPlatform(name);

        if (!platform) {
          res.status(404).json({
            success: false,
            error: 'Platform not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: platform,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes a platform and all its associated data.
   *
   * @param req - Express request with platform name in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * **WARNING: This is a destructive operation!**
   * Deletes the platform and all associated environments, configurations, and feature flags.
   *
   * **Cache Invalidation:**
   * Automatically invalidates all caches related to this platform.
   *
   * @returns HTTP 204 No Content on success, or 404 if not found
   */
  deletePlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const deleted = await this.db.platform.deletePlatform(platform);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('deletePlatform', 'platforms', duration, true);

        if (!deleted) {
          res.status(404).json({
            success: false,
            error: 'Platform not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Deleted platform ${platform} and all associated data`);

        // Invalidate all caches for this platform
        const cachePaths = this.cacheProvider.generateCachePaths(platform);
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
   * Lists all platforms in the system.
   *
   * Supports pagination via query parameters:
   * - ?page=1&perPage=20 (page-based pagination)
   * - ?limit=20&offset=0 (offset-based pagination)
   *
   * @param req - Express request
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with paginated array of platforms
   */
  listPlatforms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get pagination params (undefined if not explicitly requested)
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.platform.listPlatforms(pagination);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listPlatforms', 'platforms', duration, true);

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
          const tokenResult = result as { items: typeof result.items; nextToken?: string };
          res.json({
            success: true,
            data: result.items,
            meta: {
              nextToken: tokenResult.nextToken,
              hasMore: !!tokenResult.nextToken,
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
   * Creates a new environment within a platform.
   *
   * @param req - Express request with platform in params and environment data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Environments represent deployment targets (e.g., "development", "staging", "production").
   * Validates that the platform exists before creating the environment.
   *
   * @returns HTTP 201 with created environment data, or 400 if environment name is missing
   */
  createEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };
      const { environment, description } = req.body;

      if (!environment || typeof environment !== 'string') {
        res.status(422).json({
          success: false,
          error: 'Environment name is required',
          code: 'VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await withDatabaseContext(req, async () => {
        // Validate that platform exists
        const platformData = await this.db.platform.getPlatform(platform);
        if (!platformData) {
          res.status(404).json({
            success: false,
            error: `Platform '${platform}' not found`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const env = await this.db.environment.createEnvironment({
          platform,
          environment,
          description,
        });

        logger.info(`Created environment ${environment} for platform ${platform}`);

        res.status(201).json({
          success: true,
          data: env,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves a specific environment within a platform.
   *
   * @param req - Express request with platform and environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with environment data, or 404 if not found
   */
  getEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      await withDatabaseContext(req, async () => {
        const env = await this.db.environment.getEnvironment(platform, environment);

        if (!env) {
          res.status(404).json({
            success: false,
            error: 'Environment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: env,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes an environment and all its associated data.
   *
   * @param req - Express request with platform and environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * **WARNING: This is a destructive operation!**
   * Deletes the environment and all associated configurations, feature flags, and experiments.
   *
   * **Cache Invalidation:**
   * Automatically invalidates all caches related to this environment.
   *
   * @returns HTTP 204 No Content on success, or 404 if not found
   */
  deleteEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const deleted = await this.db.environment.deleteEnvironment(platform, environment);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('deleteEnvironment', 'environments', duration, true);

        if (!deleted) {
          res.status(404).json({
            success: false,
            error: 'Environment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Deleted environment ${environment} for platform ${platform} and all associated data`);

        // Invalidate all caches for this environment
        const cachePaths = this.cacheProvider.generateCachePaths(platform, environment);
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
   * Lists all environments for a platform.
   *
   * Supports pagination via query parameters:
   * - ?page=1&perPage=20 (page-based pagination)
   * - ?limit=20&offset=0 (offset-based pagination)
   *
   * @param req - Express request with platform in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns HTTP 200 with paginated array of environments
   */
  listEnvironments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };
      // Get pagination params (undefined if not explicitly requested)
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.environment.listEnvironments(platform, pagination);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listEnvironments', 'environments', duration, true);

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
          const tokenResult = result as { items: typeof result.items; nextToken?: string };
          res.json({
            success: true,
            data: result.items,
            meta: {
              nextToken: tokenResult.nextToken,
              hasMore: !!tokenResult.nextToken,
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
   * Invalidates all CloudFront/CDN caches globally.
   *
   * @param req - Express request
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * **WARNING: This invalidates ALL cached configurations globally!**
   * Use this endpoint carefully as it will invalidate all caches for all platforms,
   * environments, and versions. This is typically used for emergency cache busting
   * or after major infrastructure changes.
   *
   * @returns HTTP 200 with invalidation details
   */
  invalidateAllCache = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invalidationId = await this.cacheProvider.invalidateGlobalCache();

      if (invalidationId) {
        logger.logCloudFrontInvalidation(invalidationId, ['/*'], true);
      }
      logger.info(`Created global cache invalidation ${invalidationId || 'skipped'}`);

      // Return JSON response with invalidation details
      res.status(200).json({
        success: true,
        message: 'Global cache invalidation initiated',
        invalidatedPaths: ['/*'],
        invalidationId: invalidationId || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Invalidates CloudFront cache for configuration paths.
   *
   * @param req - Express request with invalidation parameters in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Supports granular invalidation at different levels:
   * - No parameters: Global invalidation (all configurations)
   * - platform only: All configurations for that platform
   * - platform + environment: All versions in that environment
   * - platform + environment + version: Specific version only
   *
   * @throws {ZodError} If request body validation fails
   * @returns HTTP 200 with invalidation ID and paths, or 400 if validation fails
   */
  invalidateCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = CacheInvalidationSchema.parse(req.body);

      const paths = this.cacheProvider.generateCachePaths(
        validatedData.platform,
        validatedData.environment,
        validatedData.version
      );

      const startTime = Date.now();
      const invalidationId = await this.cacheProvider.invalidateCache(paths);
      const duration = Date.now() - startTime;

      if (invalidationId) {
        logger.logCloudFrontInvalidation(invalidationId, paths, true);
      }
      logger.info(`Created cache invalidation ${invalidationId || 'skipped'} for paths: ${paths.join(', ')}`);

      res.json({
        success: true,
        data: {
          invalidationId,
          paths,
          duration,
        },
        timestamp: new Date().toISOString(),
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