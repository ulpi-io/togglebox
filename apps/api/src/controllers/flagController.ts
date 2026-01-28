import { Request, Response, NextFunction } from 'express';
import { ThreeTierRepositories } from '@togglebox/database';
import { logger, getTokenPaginationParams, withDatabaseContext } from '@togglebox/shared';
import {
  CreateFlagSchema,
  UpdateFlagSchema,
  UpdateRolloutSchema,
  EvaluationContextSchema,
  evaluateFlag,
} from '@togglebox/flags';
import { CacheProvider } from '@togglebox/cache';
import { z } from 'zod';

/**
 * Controller for Feature Flags (Tier 2: 2-value model with country/language targeting).
 *
 * @remarks
 * This is the 2-value flag model from @togglebox/flags.
 * For complex multi-variant testing, use Experiments (Tier 3).
 */
export class FlagController {
  private repos: ThreeTierRepositories;
  private cacheProvider: CacheProvider;

  constructor(repos: ThreeTierRepositories, cacheProvider: CacheProvider) {
    this.repos = repos;
    this.cacheProvider = cacheProvider;
  }

  /**
   * Creates a new feature flag.
   *
   * POST /platforms/:platform/environments/:environment/flags
   */
  createFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      const bodyData = CreateFlagSchema.parse({
        ...req.body,
        platform,
        environment,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.create(bodyData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('createFlag', 'flags', duration, true);
        logger.info(`Created flag ${flag.flagKey} for ${flag.platform}/${flag.environment}`);

        this.invalidateFlagCache(platform, environment, flag.flagKey);

        res.status(201).json({
          success: true,
          data: flag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Updates a feature flag (creates new version).
   *
   * PUT /platforms/:platform/environments/:environment/flags/:flagKey
   */
  updateFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      const bodyData = UpdateFlagSchema.parse({
        ...req.body,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.update(platform, environment, flagKey, bodyData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updateFlag', 'flags', duration, true);
        logger.info(`Updated flag ${flagKey} to v${flag.version} for ${platform}/${environment}`);

        this.invalidateFlagCache(platform, environment, flagKey);

        res.json({
          success: true,
          data: flag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
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
   * Toggles a flag's enabled state (in-place, no new version).
   *
   * PATCH /platforms/:platform/environments/:environment/flags/:flagKey/toggle
   */
  toggleFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.toggle(platform, environment, flagKey, enabled);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('toggleFlag', 'flags', duration, true);
        logger.info(`Toggled flag ${flagKey} to ${enabled} for ${platform}/${environment}`);

        this.invalidateFlagCache(platform, environment, flagKey);

        res.json({
          success: true,
          data: flag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
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
   * Updates rollout settings (in-place, no new version).
   *
   * PATCH /platforms/:platform/environments/:environment/flags/:flagKey/rollout
   *
   * @remarks
   * This endpoint allows quick percentage changes without creating a new version.
   * Useful for gradual rollouts (10% -> 50% -> 100%).
   */
  updateRolloutSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      const settings = UpdateRolloutSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.updateRolloutSettings(
          platform,
          environment,
          flagKey,
          settings
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updateRolloutSettings', 'flags', duration, true);
        logger.info(
          `Updated rollout for ${flagKey}: enabled=${flag.rolloutEnabled}, A=${flag.rolloutPercentageA}%, B=${flag.rolloutPercentageB}%`
        );

        this.invalidateFlagCache(platform, environment, flagKey);

        res.json({
          success: true,
          data: flag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
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
   * Gets the active version of a flag.
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey
   */
  getFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.getActive(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlag', 'flags', duration, true);

        if (!flag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: flag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Gets a specific version of a flag.
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey/versions/:version
   */
  getFlagVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey, version } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
        version: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.getVersion(platform, environment, flagKey, version);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlagVersion', 'flags', duration, true);

        if (!flag) {
          res.status(404).json({
            success: false,
            error: `Feature flag version ${version} not found`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: flag,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Lists all active flags for an environment.
   *
   * GET /platforms/:platform/environments/:environment/flags
   */
  listFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.repos.flag.listActive(
          platform,
          environment,
          pagination?.limit,
          pagination?.nextToken
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listFlags', 'flags', duration, true);

        res.json({
          success: true,
          data: result.items,
          meta: {
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
          },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Lists all versions of a flag.
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey/versions
   */
  listFlagVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const versions = await this.repos.flag.listVersions(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listFlagVersions', 'flags', duration, true);

        res.json({
          success: true,
          data: versions,
          meta: { total: versions.length },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Deletes a flag and all its versions.
   *
   * DELETE /platforms/:platform/environments/:environment/flags/:flagKey
   */
  deleteFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        await this.repos.flag.delete(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('deleteFlag', 'flags', duration, true);
        logger.info(`Deleted flag ${flagKey} for ${platform}/${environment}`);

        this.invalidateFlagCache(platform, environment, flagKey);

        res.status(204).send();
      });
    } catch (error: unknown) {
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
   * Evaluates a flag for a user context (public GET endpoint).
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey/evaluate
   */
  evaluateFlagPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };
      const { userId, country, language } = req.query;

      const context = EvaluationContextSchema.parse({
        userId: userId as string,
        country: country as string | undefined,
        language: language as string | undefined,
      });

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.getActive(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlag', 'flags', duration, true);

        if (!flag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const evaluation = evaluateFlag(flag, context);

        // Track the evaluation - use servedValue which correctly indicates 'A' or 'B'
        await this.repos.stats.incrementFlagEvaluation(
          platform,
          environment,
          flagKey,
          evaluation.servedValue,
          context.userId,
          context.country
        );

        res.json({
          success: true,
          data: evaluation,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Evaluates a flag for a user context (POST endpoint with body).
   *
   * POST /platforms/:platform/environments/:environment/flags/:flagKey/evaluate
   */
  evaluateFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      const context = EvaluationContextSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const flag = await this.repos.flag.getActive(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlag', 'flags', duration, true);

        if (!flag) {
          res.status(404).json({
            success: false,
            error: 'Feature flag not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const evaluation = evaluateFlag(flag, context);

        // Track the evaluation - use servedValue which correctly indicates 'A' or 'B'
        await this.repos.stats.incrementFlagEvaluation(
          platform,
          environment,
          flagKey,
          evaluation.servedValue,
          context.userId,
          context.country
        );

        res.json({
          success: true,
          data: evaluation,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Helper method to invalidate cache for a flag.
   */
  private invalidateFlagCache(platform: string, environment: string, flagKey: string): void {
    const cachePaths = [
      `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}`,
      `/api/v1/platforms/${platform}/environments/${environment}/flags`,
    ];

    this.cacheProvider.invalidateCache(cachePaths).catch((err: unknown) => {
      logger.error('Cache invalidation failed (non-blocking)', err);
    });
  }
}
