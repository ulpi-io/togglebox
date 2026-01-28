import { Request, Response, NextFunction } from 'express';
import { DatabaseRepositories } from '@togglebox/database';
import { logger, withDatabaseContext, getSmartPaginationParams, createPaginationMeta } from '@togglebox/shared';
import { CacheProvider } from '@togglebox/cache';
import {
  CONFIG_LIMITS,
  CreateConfigParameterSchema as SharedCreateConfigParameterSchema,
  UpdateConfigParameterSchema as SharedUpdateConfigParameterSchema,
} from '@togglebox/configs';
import { z } from 'zod';

/**
 * Zod schema for cache invalidation request validation
 */
const CacheInvalidationSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  environment: z.string().min(1, 'Environment is required'),
  version: z.string().optional(),
});

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
 * Zod schema for platform update validation
 */
const UpdatePlatformSchema = z.object({
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

/**
 * Zod schema for environment creation validation
 */
const CreateEnvironmentSchema = z.object({
  environment: z.string()
    .min(1, 'Environment name is required')
    .max(100, 'Environment name must be 100 characters or less')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Environment name can only contain letters, numbers, hyphens, and underscores'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

/**
 * Zod schema for environment update validation
 */
const UpdateEnvironmentSchema = z.object({
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

// Note: Config parameter schemas are imported from @togglebox/configs for consistent validation
// (validates defaultValue against valueType, enforces MAX_VALUE_LENGTH)

/**
 * Zod schema for rollback request.
 */
const RollbackSchema = z.object({
  version: z.string().regex(/^\d+$/, 'Version must be a numeric string (e.g., "1", "2", "3")'),
});

/**
 * Controller handling all configuration-related HTTP requests.
 *
 * Manages CRUD operations for platforms, environments, and config parameters.
 * Supports multiple database backends via the factory pattern.
 *
 * @remarks
 * This controller handles the three-level hierarchy:
 * - Platform: Logical application/service identifier
 * - Environment: Deployment environment (dev, staging, production)
 * - Config Parameters: Individual versioned configuration values (Firebase-style)
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

  // ============================================================================
  // CONFIG PARAMETER ENDPOINTS (Firebase-style)
  // ============================================================================

  /**
   * Gets all active config parameters as key-value object for SDK consumption.
   *
   * @param req - Express request with platform, environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * This is the primary SDK endpoint. Returns a flat key-value object
   * where values are already parsed according to their type.
   *
   * Example response:
   * ```json
   * {
   *   "storeName": "My Store",
   *   "taxRate": 0.08,
   *   "maintenanceMode": false,
   *   "themeColors": { "primary": "#007bff" }
   * }
   * ```
   *
   * @returns HTTP 200 with config key-value object
   */
  getConfigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const configs = await this.db.config.getConfigs(platform, environment);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getConfigs', 'config_parameters', duration, true);

        res.json({
          success: true,
          data: configs,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Creates a new config parameter (version 1).
   *
   * @param req - Express request with platform, environment in params and parameter data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Creates the first version of a parameter. Subsequent edits create new versions.
   *
   * @throws {ZodError} If request body validation fails
   * @returns HTTP 201 with created parameter data
   */
  createConfigParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      // Get createdBy from authenticated user
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      // Use shared schema that validates defaultValue against valueType
      const bodyData = SharedCreateConfigParameterSchema.parse({
        ...req.body,
        platform,
        environment,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        // Check parameter count limit before creating
        // Note: This is a best-effort check. Race conditions under high concurrency
        // may allow slightly exceeding the limit. For strict enforcement,
        // implement database-level constraints or use transactions.
        const currentCount = await this.db.config.count(platform, environment);
        if (currentCount >= CONFIG_LIMITS.MAX_PARAMETERS_PER_ENV) {
          res.status(422).json({
            success: false,
            error: `Maximum parameters limit reached (${CONFIG_LIMITS.MAX_PARAMETERS_PER_ENV})`,
            code: 'LIMIT_EXCEEDED',
            details: [`Environment ${platform}/${environment} already has ${currentCount} parameters`],
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const startTime = Date.now();
        let param;
        try {
          param = await this.db.config.create({
            platform,
            environment,
            parameterKey: bodyData.parameterKey,
            valueType: bodyData.valueType,
            defaultValue: bodyData.defaultValue,
            description: bodyData.description,
            parameterGroup: bodyData.parameterGroup,
            createdBy,
          });
        } catch (createError) {
          // Re-check count in case of race condition
          const recheckCount = await this.db.config.count(platform, environment);
          if (recheckCount >= CONFIG_LIMITS.MAX_PARAMETERS_PER_ENV) {
            res.status(422).json({
              success: false,
              error: `Maximum parameters limit reached (${CONFIG_LIMITS.MAX_PARAMETERS_PER_ENV})`,
              code: 'LIMIT_EXCEEDED',
              details: [`Environment ${platform}/${environment} has reached the parameter limit`],
              timestamp: new Date().toISOString(),
            });
            return;
          }
          throw createError;
        }
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('create', 'config_parameters', duration, true);
        logger.info(`Created config parameter ${param.parameterKey} (v${param.version}) for ${platform}/${environment}`);

        // Invalidate configs cache
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/configs`,
        ];
        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          // WARN level since stale cache affects data consistency
          logger.warn('Cache invalidation failed - stale data may be served', {
            paths: cachePaths,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        res.status(201).json({
          success: true,
          data: param,
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
   * Updates a config parameter (creates new version).
   *
   * @param req - Express request with platform, environment, parameterKey in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Creates a new version of the parameter. The old version is deactivated,
   * and the new version becomes active.
   *
   * @returns HTTP 200 with updated parameter data, or 404 if not found
   */
  updateConfigParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, parameterKey } = req.params as {
        platform: string;
        environment: string;
        parameterKey: string;
      };

      // Get createdBy from authenticated user
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      // Use shared schema that validates defaultValue against valueType
      const bodyData = SharedUpdateConfigParameterSchema.parse({
        ...req.body,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const param = await this.db.config.update(platform, environment, parameterKey, {
          ...bodyData,
          createdBy,
        });
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('update', 'config_parameters', duration, true);
        logger.info(`Updated config parameter ${parameterKey} to v${param.version} for ${platform}/${environment}`);

        // Invalidate configs cache
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/configs`,
        ];
        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          // WARN level since stale cache affects data consistency
          logger.warn('Cache invalidation failed - stale data may be served', {
            paths: cachePaths,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        res.json({
          success: true,
          data: param,
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
      // Handle "not found" errors from repository
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Deletes a config parameter (all versions).
   *
   * @param req - Express request with platform, environment, parameterKey in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Permanently deletes all versions of the parameter.
   *
   * @returns HTTP 204 on success, or 404 if not found
   */
  deleteConfigParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, parameterKey } = req.params as {
        platform: string;
        environment: string;
        parameterKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const deleted = await this.db.config.delete(platform, environment, parameterKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('delete', 'config_parameters', duration, true);

        if (!deleted) {
          res.status(404).json({
            success: false,
            error: 'Parameter not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Deleted config parameter ${parameterKey} (all versions) for ${platform}/${environment}`);

        // Invalidate configs cache
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/configs`,
        ];
        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          // WARN level since stale cache affects data consistency
          logger.warn('Cache invalidation failed - stale data may be served', {
            paths: cachePaths,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        res.status(204).send();
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Gets the active version of a specific parameter.
   *
   * @param req - Express request with platform, environment, parameterKey in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @returns HTTP 200 with parameter data, or 404 if not found
   */
  getConfigParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, parameterKey } = req.params as {
        platform: string;
        environment: string;
        parameterKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const param = await this.db.config.getActive(platform, environment, parameterKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getActive', 'config_parameters', duration, true);

        if (!param) {
          res.status(404).json({
            success: false,
            error: 'Parameter not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: param,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lists all active config parameters with metadata.
   *
   * @param req - Express request with platform, environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Returns full parameter metadata for admin UI, not just values.
   * Supports pagination.
   *
   * @returns HTTP 200 with paginated array of parameters
   */
  listConfigParameters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const { isToken, params, page, perPage } = getSmartPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.config.listActive(platform, environment, params);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listActive', 'config_parameters', duration, true);

        // Handle both offset-based and token-based pagination
        if ('total' in result && result.total !== undefined) {
          // Offset-based pagination (SQL/MongoDB backends)
          const paginationMeta = createPaginationMeta(page, perPage, result.total);
          res.json({
            success: true,
            data: result.items,
            meta: paginationMeta,
            timestamp: new Date().toISOString(),
          });
        } else if (isToken) {
          // Token-based pagination (DynamoDB)
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
        } else {
          // No pagination requested - return all items
          res.json({
            success: true,
            data: result.items,
            meta: { total: result.items.length },
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lists all versions of a specific parameter.
   *
   * @param req - Express request with platform, environment, parameterKey in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @returns HTTP 200 with array of parameter versions
   */
  listConfigParameterVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, parameterKey } = req.params as {
        platform: string;
        environment: string;
        parameterKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const versions = await this.db.config.listVersions(platform, environment, parameterKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listVersions', 'config_parameters', duration, true);

        res.json({
          success: true,
          data: versions,
          meta: { total: versions.length },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Rolls back a parameter to a previous version.
   *
   * @param req - Express request with platform, environment, parameterKey in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @remarks
   * Deactivates the current version and reactivates the specified version.
   *
   * @returns HTTP 200 with restored parameter, or 404 if version not found
   */
  rollbackConfigParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, parameterKey } = req.params as {
        platform: string;
        environment: string;
        parameterKey: string;
      };

      const bodyData = RollbackSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const param = await this.db.config.rollback(platform, environment, parameterKey, bodyData.version);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('rollback', 'config_parameters', duration, true);

        if (!param) {
          res.status(404).json({
            success: false,
            error: `Version ${bodyData.version} not found for parameter ${parameterKey}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Rolled back config parameter ${parameterKey} to v${bodyData.version} for ${platform}/${environment}`);

        // Invalidate configs cache
        const cachePaths = [
          `/api/v1/platforms/${platform}/environments/${environment}/configs`,
        ];
        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          // WARN level since stale cache affects data consistency
          logger.warn('Cache invalidation failed - stale data may be served', {
            paths: cachePaths,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        res.json({
          success: true,
          data: param,
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
   * Counts active config parameters in an environment.
   *
   * @param req - Express request with platform, environment in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   *
   * @returns HTTP 200 with count
   */
  countConfigParameters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const count = await this.db.config.count(platform, environment);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('count', 'config_parameters', duration, true);

        res.json({
          success: true,
          data: { count },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // PLATFORM ENDPOINTS
  // ============================================================================

  /**
   * Creates a new platform.
   */
  createPlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = CreatePlatformSchema.parse(req.body);
      const user = (req as unknown as { user?: { id?: string } }).user;
      const createdBy = user?.id;

      await withDatabaseContext(req, async () => {
        const platform = await this.db.platform.createPlatform({
          name: validatedData.name,
          description: validatedData.description,
          createdBy,
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
   */
  deletePlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };
      const user = (req as unknown as { user?: { role?: string } }).user;

      if (user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Only admins can delete platforms',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

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

        const cachePaths = this.cacheProvider.generateCachePaths(platform);
        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          // WARN level since stale cache affects data consistency
          logger.warn('Cache invalidation failed - stale data may be served', {
            paths: cachePaths,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        res.status(204).send();
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lists all platforms in the system.
   */
  listPlatforms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { isToken, params, page, perPage } = getSmartPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.platform.listPlatforms(params);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listPlatforms', 'platforms', duration, true);

        if ('total' in result && result.total !== undefined) {
          // Offset-based pagination (SQL/MongoDB backends)
          const paginationMeta = createPaginationMeta(page, perPage, result.total);
          res.json({
            success: true,
            data: result.items,
            meta: paginationMeta,
            timestamp: new Date().toISOString(),
          });
        } else if (isToken) {
          // Token-based pagination (DynamoDB)
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
        } else {
          // No pagination requested - return all items
          res.json({
            success: true,
            data: result.items,
            meta: { total: result.items.length },
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates a platform's editable fields.
   */
  updatePlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };
      const validatedData = UpdatePlatformSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        if (!this.db.platform.updatePlatform) {
          res.status(501).json({
            success: false,
            error: 'Update operation not supported by current database adapter',
            code: 'NOT_IMPLEMENTED',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const startTime = Date.now();
        const updated = await this.db.platform.updatePlatform(platform, validatedData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updatePlatform', 'platforms', duration, true);

        if (!updated) {
          res.status(404).json({
            success: false,
            error: 'Platform not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Updated platform ${platform}`);

        res.json({
          success: true,
          data: updated,
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

  // ============================================================================
  // ENVIRONMENT ENDPOINTS
  // ============================================================================

  /**
   * Creates a new environment within a platform.
   */
  createEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };

      // Validate request body with Zod schema
      const parseResult = CreateEnvironmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map(e => e.message);
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: errorMessages,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { environment, description } = parseResult.data;
      const user = (req as unknown as { user?: { id?: string } }).user;
      const createdBy = user?.id;

      await withDatabaseContext(req, async () => {
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
          createdBy,
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
   */
  deleteEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const user = (req as unknown as { user?: { role?: string } }).user;

      if (user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Only admins can delete environments',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        });
        return;
      }

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

        const cachePaths = this.cacheProvider.generateCachePaths(platform, environment);
        this.cacheProvider.invalidateCache(cachePaths).catch(err => {
          // WARN level since stale cache affects data consistency
          logger.warn('Cache invalidation failed - stale data may be served', {
            paths: cachePaths,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        res.status(204).send();
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lists all environments for a platform.
   */
  listEnvironments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform } = req.params as { platform: string };
      const { isToken, params, page, perPage } = getSmartPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.db.environment.listEnvironments(platform, params);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listEnvironments', 'environments', duration, true);

        if ('total' in result && result.total !== undefined) {
          // Offset-based pagination (SQL/MongoDB backends)
          const paginationMeta = createPaginationMeta(page, perPage, result.total);
          res.json({
            success: true,
            data: result.items,
            meta: paginationMeta,
            timestamp: new Date().toISOString(),
          });
        } else if (isToken) {
          // Token-based pagination (DynamoDB)
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
        } else {
          // No pagination requested - return all items
          res.json({
            success: true,
            data: result.items,
            meta: { total: result.items.length },
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates an environment's editable fields.
   */
  updateEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const validatedData = UpdateEnvironmentSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        if (!this.db.environment.updateEnvironment) {
          res.status(501).json({
            success: false,
            error: 'Update operation not supported by current database adapter',
            code: 'NOT_IMPLEMENTED',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const startTime = Date.now();
        const updated = await this.db.environment.updateEnvironment(platform, environment, validatedData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updateEnvironment', 'environments', duration, true);

        if (!updated) {
          res.status(404).json({
            success: false,
            error: 'Environment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        logger.info(`Updated environment ${environment} for platform ${platform}`);

        res.json({
          success: true,
          data: updated,
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

  // ============================================================================
  // CACHE INVALIDATION ENDPOINTS
  // ============================================================================

  /**
   * Invalidates all CloudFront/CDN caches globally.
   */
  invalidateAllCache = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invalidationId = await this.cacheProvider.invalidateGlobalCache();

      if (invalidationId) {
        logger.logCloudFrontInvalidation(invalidationId, ['/*'], true);
      }
      logger.info(`Created global cache invalidation ${invalidationId || 'skipped'}`);

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
