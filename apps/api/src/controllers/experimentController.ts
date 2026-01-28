import { Request, Response, NextFunction } from 'express';
import { ThreeTierRepositories } from '@togglebox/database';
import { logger, getTokenPaginationParams, withDatabaseContext } from '@togglebox/shared';
import {
  CreateExperimentSchema,
  UpdateExperimentSchema,
  StartExperimentSchema,
  CompleteExperimentSchema,
  ExperimentContextSchema,
} from '@togglebox/experiments';
import { assignVariation } from '@togglebox/experiments';
import { calculateSignificance, checkSRM } from '@togglebox/stats';
import { CacheProvider } from '@togglebox/cache';
import { z } from 'zod';

/**
 * Controller for Experiments (A/B testing with multiple variants).
 *
 * @remarks
 * Experiments support 2+ variants with traffic allocation, metrics tracking,
 * and statistical significance analysis.
 */
export class ExperimentController {
  private repos: ThreeTierRepositories;
  private cacheProvider: CacheProvider;

  constructor(repos: ThreeTierRepositories, cacheProvider: CacheProvider) {
    this.repos = repos;
    this.cacheProvider = cacheProvider;
  }

  /**
   * Creates a new experiment (draft status).
   *
   * POST /platforms/:platform/environments/:environment/experiments
   */
  createExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      const bodyData = CreateExperimentSchema.parse({
        ...req.body,
        platform,
        environment,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.create(bodyData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('createExperiment', 'experiments', duration, true);
        logger.info(`Created experiment ${experiment.experimentKey} for ${platform}/${environment}`);

        res.status(201).json({
          success: true,
          data: experiment,
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
   * Updates an experiment (only allowed in draft status).
   *
   * PUT /platforms/:platform/environments/:environment/experiments/:experimentKey
   */
  updateExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };
      const user = (req as unknown as { user?: { email?: string } }).user;
      const createdBy = user?.email || 'system@togglebox.dev';

      const bodyData = UpdateExperimentSchema.parse({
        ...req.body,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        // Fetch current experiment to validate merged state
        const current = await this.repos.experiment.get(platform, environment, experimentKey);
        if (!current) {
          throw new Error(`Experiment ${experimentKey} not found`);
        }

        // Merge update data with current data
        const mergedVariations = bodyData.variations ?? current.variations;
        const mergedControlVariation = bodyData.controlVariation ?? current.controlVariation;
        const mergedTrafficAllocation = bodyData.trafficAllocation ?? current.trafficAllocation;

        // Validate merged state: control variation must exist in variations
        const variationKeys = new Set(mergedVariations.map((v) => v.key));
        if (!variationKeys.has(mergedControlVariation)) {
          throw new Error(`Control variation "${mergedControlVariation}" does not exist in variations. Valid variations: ${[...variationKeys].join(', ')}`);
        }

        // Validate merged state: all traffic allocation keys must exist in variations
        const invalidTrafficKeys = mergedTrafficAllocation
          .filter((t) => !variationKeys.has(t.variationKey))
          .map((t) => t.variationKey);
        if (invalidTrafficKeys.length > 0) {
          throw new Error(`Traffic allocation contains invalid variation keys: ${invalidTrafficKeys.join(', ')}. Valid variations: ${[...variationKeys].join(', ')}`);
        }

        // Validate merged state: traffic allocation must sum to 100%
        const totalPercentage = mergedTrafficAllocation.reduce((sum, t) => sum + t.percentage, 0);
        if (Math.abs(totalPercentage - 100) >= 0.01) {
          throw new Error(`Traffic allocation must sum to 100%, got ${totalPercentage}%`);
        }

        const startTime = Date.now();
        const experiment = await this.repos.experiment.update(platform, environment, experimentKey, bodyData);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updateExperiment', 'experiments', duration, true);
        logger.info(`Updated experiment ${experimentKey} for ${platform}/${environment}`);

        res.json({
          success: true,
          data: experiment,
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
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Starts an experiment (draft → running).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/start
   */
  startExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };
      const { startedBy } = StartExperimentSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.start(platform, environment, experimentKey, startedBy);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('startExperiment', 'experiments', duration, true);
        logger.info(`Started experiment ${experimentKey} for ${platform}/${environment}`);

        this.invalidateExperimentCache(platform, environment, experimentKey);

        res.json({
          success: true,
          data: experiment,
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
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Pauses an experiment (running → paused).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/pause
   */
  pauseExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.pause(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('pauseExperiment', 'experiments', duration, true);
        logger.info(`Paused experiment ${experimentKey} for ${platform}/${environment}`);

        this.invalidateExperimentCache(platform, environment, experimentKey);

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Resumes an experiment (paused → running).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/resume
   */
  resumeExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.resume(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('resumeExperiment', 'experiments', duration, true);
        logger.info(`Resumed experiment ${experimentKey} for ${platform}/${environment}`);

        this.invalidateExperimentCache(platform, environment, experimentKey);

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Completes an experiment with optional winner (running/paused → completed).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/complete
   */
  completeExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };
      const { winner, completedBy } = CompleteExperimentSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        // Validate winner exists in experiment variations
        if (winner) {
          const current = await this.repos.experiment.get(platform, environment, experimentKey);
          if (!current) {
            throw new Error(`Experiment ${experimentKey} not found`);
          }
          if (!current.variations.some((v) => v.key === winner)) {
            throw new Error(`Winner variation "${winner}" does not exist in experiment ${experimentKey}. Valid variations: ${current.variations.map(v => v.key).join(', ')}`);
          }
        }

        const startTime = Date.now();
        const experiment = await this.repos.experiment.complete(
          platform,
          environment,
          experimentKey,
          winner,
          completedBy
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('completeExperiment', 'experiments', duration, true);
        logger.info(`Completed experiment ${experimentKey} for ${platform}/${environment}, winner: ${winner || 'none'}`);

        this.invalidateExperimentCache(platform, environment, experimentKey);

        res.json({
          success: true,
          data: experiment,
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
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Archives an experiment (completed → archived).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/archive
   */
  archiveExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.archive(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('archiveExperiment', 'experiments', duration, true);
        logger.info(`Archived experiment ${experimentKey} for ${platform}/${environment}`);

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Gets an experiment.
   *
   * GET /platforms/:platform/environments/:environment/experiments/:experimentKey
   */
  getExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.get(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getExperiment', 'experiments', duration, true);

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: 'Experiment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Lists experiments for an environment.
   *
   * GET /platforms/:platform/environments/:environment/experiments
   */
  listExperiments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };
      const { status } = req.query;
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.repos.experiment.list(
          platform,
          environment,
          status as 'draft' | 'running' | 'paused' | 'completed' | 'archived' | undefined,
          pagination?.limit,
          pagination?.nextToken
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('listExperiments', 'experiments', duration, true);

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
   * Deletes an experiment (cannot delete running experiments).
   *
   * DELETE /platforms/:platform/environments/:environment/experiments/:experimentKey
   */
  deleteExperiment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        await this.repos.experiment.delete(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('deleteExperiment', 'experiments', duration, true);
        logger.info(`Deleted experiment ${experimentKey} for ${platform}/${environment}`);

        this.invalidateExperimentCache(platform, environment, experimentKey);

        res.status(204).send();
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Assigns a user to a variation (public GET endpoint).
   *
   * GET /platforms/:platform/environments/:environment/experiments/:experimentKey/assign
   */
  assignVariationPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };
      const { userId, country, language } = req.query;

      const context = ExperimentContextSchema.parse({
        userId: userId as string,
        country: country as string | undefined,
        language: language as string | undefined,
      });

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.get(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getExperiment', 'experiments', duration, true);

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: 'Experiment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const assignment = assignVariation(experiment, context);

        if (!assignment) {
          res.json({
            success: true,
            data: {
              experimentKey,
              assigned: false,
              reason: 'User not eligible for experiment',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Record the exposure
        await this.repos.stats.recordExperimentExposure(
          platform,
          environment,
          experimentKey,
          assignment.variationKey,
          context.userId
        );

        res.json({
          success: true,
          data: assignment,
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
   * Assigns a user to a variation (POST endpoint).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/assign
   */
  assignVariation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      const context = ExperimentContextSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.get(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getExperiment', 'experiments', duration, true);

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: 'Experiment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const assignment = assignVariation(experiment, context);

        if (!assignment) {
          res.json({
            success: true,
            data: {
              experimentKey,
              assigned: false,
              reason: 'User not eligible for experiment',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Record the exposure
        await this.repos.stats.recordExperimentExposure(
          platform,
          environment,
          experimentKey,
          assignment.variationKey,
          context.userId
        );

        res.json({
          success: true,
          data: assignment,
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
   * Gets experiment results with statistical analysis.
   *
   * GET /platforms/:platform/environments/:environment/experiments/:experimentKey/results
   */
  getExperimentResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        // Get experiment
        const experiment = await this.repos.experiment.get(platform, environment, experimentKey);

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: 'Experiment not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get stats
        const stats = await this.repos.stats.getExperimentStats(platform, environment, experimentKey);

        if (!stats || stats.variations.length < 2) {
          res.json({
            success: true,
            data: {
              experiment,
              stats: null,
              analysis: null,
              message: 'Not enough data for analysis',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Build variation data for analysis
        const variationData = await Promise.all(
          stats.variations.map(async (v) => {
            // Get metric stats for primary metric
            const metricStats = await this.repos.stats.getExperimentMetricStats(
              platform,
              environment,
              experimentKey,
              v.variationKey,
              experiment.primaryMetric.id
            );

            const totalConversions = metricStats.reduce((sum, m) => sum + m.conversions, 0);

            return {
              variationKey: v.variationKey,
              participants: v.participants,
              conversions: totalConversions,
            };
          })
        );

        // Find control variation
        const controlData = variationData.find((v) => v.variationKey === experiment.controlVariation);
        const treatmentData = variationData.filter((v) => v.variationKey !== experiment.controlVariation);

        let significance = null;
        if (controlData && treatmentData.length > 0 && treatmentData[0]) {
          significance = calculateSignificance(
            controlData,
            treatmentData[0],
            experiment.confidenceLevel
          );
        }

        // Check for Sample Ratio Mismatch
        const expectedRatios = experiment.trafficAllocation.map((t) => t.percentage / 100);
        const srmResult = checkSRM(variationData, expectedRatios);

        res.json({
          success: true,
          data: {
            experiment,
            stats,
            analysis: {
              variationData,
              significance,
              srm: srmResult,
            },
          },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Updates traffic allocation for a running or paused experiment.
   * This allows adjusting rollout percentages without stopping the experiment.
   *
   * PATCH /platforms/:platform/environments/:environment/experiments/:experimentKey/traffic
   */
  updateTrafficAllocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      const TrafficAllocationUpdateSchema = z.object({
        trafficAllocation: z.array(z.object({
          variationKey: z.string(),
          percentage: z.number().min(0).max(100),
        })).min(2),
      });

      const { trafficAllocation } = TrafficAllocationUpdateSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.updateTrafficAllocation(
          platform,
          environment,
          experimentKey,
          trafficAllocation
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('updateTrafficAllocation', 'experiments', duration, true);
        logger.info(`Updated traffic allocation for experiment ${experimentKey} in ${platform}/${environment}`);

        this.invalidateExperimentCache(platform, environment, experimentKey);

        res.json({
          success: true,
          data: experiment,
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
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot') || error.message.includes('must sum'))) {
        res.status(error.message.includes('not found') ? 404 : 400).json({
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
   * Helper method to invalidate cache for an experiment.
   */
  private invalidateExperimentCache(platform: string, environment: string, experimentKey: string): void {
    const cachePaths = [
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
      `/api/v1/platforms/${platform}/environments/${environment}/experiments`,
    ];

    this.cacheProvider.invalidateCache(cachePaths).catch((err: unknown) => {
      logger.error('Cache invalidation failed (non-blocking)', err);
    });
  }
}
