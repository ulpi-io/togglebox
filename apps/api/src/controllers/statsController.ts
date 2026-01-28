import { Request, Response, NextFunction } from 'express';
import { ThreeTierRepositories } from '@togglebox/database';
import { logger, withDatabaseContext } from '@togglebox/shared';
import { StatsEventSchema, checkSRM, getSRMSeverity } from '@togglebox/stats';
import type { SRMResult } from '@togglebox/stats';
import { z } from 'zod';

/**
 * Schema for batch events request.
 * Maximum 100 events per batch to prevent DoS attacks and align with SDK schema.
 * Note: SDKs batch events (default: 20 per batch), so 100 is generous.
 */
const BatchEventsSchema = z.object({
  events: z.array(StatsEventSchema).min(1).max(100),
});

/**
 * Controller for Statistics operations.
 *
 * @remarks
 * Handles SDK event ingestion and stats retrieval for all three tiers:
 * - Remote Configs (fetch counts)
 * - Feature Flags (evaluation counts by value)
 * - Experiments (exposures and conversions)
 */
export class StatsController {
  private repos: ThreeTierRepositories;

  constructor(repos: ThreeTierRepositories) {
    this.repos = repos;
  }

  /**
   * Processes a batch of events from SDK.
   *
   * POST /platforms/:platform/environments/:environment/stats/events
   */
  processBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment } = req.params as { platform: string; environment: string };

      const { events } = BatchEventsSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        await this.repos.stats.processBatch(platform, environment, events);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('processBatch', 'stats', duration, true);
        logger.info(`Processed ${events.length} events for ${platform}/${environment}`);

        res.json({
          success: true,
          data: {
            processed: events.length,
          },
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
   * Gets stats for a Remote Config.
   *
   * GET /platforms/:platform/environments/:environment/configs/:configKey/stats
   */
  getConfigStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, configKey } = req.params as {
        platform: string;
        environment: string;
        configKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const stats = await this.repos.stats.getConfigStats(platform, environment, configKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getConfigStats', 'stats', duration, true);

        if (!stats) {
          res.json({
            success: true,
            data: {
              platform,
              environment,
              configKey,
              fetchCount: 0,
              uniqueClients24h: 0,
              updatedAt: null,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Gets stats for a Feature Flag.
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey/stats
   */
  getFlagStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const stats = await this.repos.stats.getFlagStats(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlagStats', 'stats', duration, true);

        if (!stats) {
          res.json({
            success: true,
            data: {
              platform,
              environment,
              flagKey,
              totalEvaluations: 0,
              valueACount: 0,
              valueBCount: 0,
              uniqueUsersA24h: 0,
              uniqueUsersB24h: 0,
              updatedAt: null,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Gets flag stats by country.
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey/stats/by-country
   */
  getFlagStatsByCountry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const stats = await this.repos.stats.getFlagStatsByCountry(platform, environment, flagKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlagStatsByCountry', 'stats', duration, true);

        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Gets flag stats daily time series.
   *
   * GET /platforms/:platform/environments/:environment/flags/:flagKey/stats/daily
   */
  getFlagStatsDaily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, flagKey } = req.params as {
        platform: string;
        environment: string;
        flagKey: string;
      };
      // Validate days: minimum 1, maximum 365, default 30
      const rawDays = parseInt(req.query['days'] as string) || 30;
      const days = Math.min(Math.max(rawDays, 1), 365);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const stats = await this.repos.stats.getFlagStatsDaily(platform, environment, flagKey, days);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getFlagStatsDaily', 'stats', duration, true);

        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Gets stats for an Experiment.
   * Includes SRM (Sample Ratio Mismatch) detection to identify potential
   * issues with traffic allocation.
   *
   * GET /platforms/:platform/environments/:environment/experiments/:experimentKey/stats
   */
  getExperimentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      // Get expected ratios from query params (comma-separated, e.g., "0.5,0.5")
      // Default to equal distribution if not provided
      const expectedRatiosParam = req.query['expectedRatios'] as string | undefined;

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const stats = await this.repos.stats.getExperimentStats(platform, environment, experimentKey);
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('getExperimentStats', 'stats', duration, true);

        if (!stats) {
          res.json({
            success: true,
            data: {
              platform,
              environment,
              experimentKey,
              variations: [],
              metricResults: [],
              dailyData: [],
              srm: null,
              updatedAt: null,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Fetch experiment to get metric IDs and traffic allocation
        const experiment = await this.repos.experiment.get(platform, environment, experimentKey);

        // Populate metricResults from experiment metrics
        let metricResults = stats.metricResults;
        if (experiment && stats.variations.length > 0) {
          const metricIds = [
            experiment.primaryMetric?.id,
            ...(experiment.secondaryMetrics?.map((m) => m.id) ?? []),
          ].filter(Boolean) as string[];

          if (metricIds.length > 0) {
            // Fetch metric stats for all variations and metrics
            const metricStatsPromises = stats.variations.flatMap((v) =>
              metricIds.map((metricId) =>
                this.repos.stats.getExperimentMetricStats(
                  platform,
                  environment,
                  experimentKey,
                  v.variationKey,
                  metricId
                )
              )
            );

            const allMetricStats = await Promise.all(metricStatsPromises);
            metricResults = allMetricStats.flat();
          }
        }

        // Calculate SRM if we have variation data
        let srm: (SRMResult & { severity: string }) | null = null;

        if (stats.variations.length >= 2) {
          // Parse expected ratios, use experiment's trafficAllocation, or default to equal distribution
          let expectedRatios: number[];

          if (expectedRatiosParam) {
            // Use explicit ratios from query param
            expectedRatios = expectedRatiosParam.split(',').map((r) => parseFloat(r.trim()));
          } else if (experiment?.trafficAllocation?.length) {
            // Use configured traffic allocation (convert from percentage to ratio)
            expectedRatios = experiment.trafficAllocation.map((t) => t.percentage / 100);
          } else {
            // Default to equal distribution
            const equalRatio = 1 / stats.variations.length;
            expectedRatios = stats.variations.map(() => equalRatio);
          }

          // Validate that expected ratios match number of variations
          if (expectedRatios.length === stats.variations.length) {
            try {
              // Convert to VariationData format for checkSRM
              const variationData = stats.variations.map((v) => ({
                variationKey: v.variationKey,
                participants: v.participants,
                conversions: 0, // Not needed for SRM check
              }));

              const srmResult = checkSRM(variationData, expectedRatios);
              srm = {
                ...srmResult,
                severity: getSRMSeverity(srmResult.pValue),
              };
            } catch (err) {
              // Log but don't fail the request if SRM calculation fails
              logger.warn('Failed to calculate SRM', {
                error: err instanceof Error ? err.message : String(err),
                experimentKey,
              });
            }
          }
        }

        res.json({
          success: true,
          data: {
            ...stats,
            metricResults,
            srm,
          },
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Records a conversion event.
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/conversions
   */
  recordConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      const ConversionSchema = z.object({
        metricId: z.string().min(1, 'metricId is required'),
        variationKey: z.string().min(1, 'variationKey is required'),
        userId: z.string().min(1, 'userId is required'),
        value: z.number().optional(),
      });

      const { metricId, variationKey, userId, value } = ConversionSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        // Validate that metricId and variationKey belong to the experiment
        const experiment = await this.repos.experiment.get(platform, environment, experimentKey);

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: `Experiment not found: ${experimentKey}`,
            code: 'EXPERIMENT_NOT_FOUND',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate variationKey belongs to experiment
        const validVariationKeys = experiment.variations?.map((v) => v.key) ?? [];
        if (!validVariationKeys.includes(variationKey)) {
          res.status(422).json({
            success: false,
            error: `Invalid variationKey: ${variationKey}. Valid keys: ${validVariationKeys.join(', ')}`,
            code: 'INVALID_VARIATION_KEY',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate metricId belongs to experiment (primary or secondary)
        const validMetricIds = [
          experiment.primaryMetric?.id,
          ...(experiment.secondaryMetrics?.map((m) => m.id) ?? []),
        ].filter(Boolean) as string[];

        if (!validMetricIds.includes(metricId)) {
          res.status(422).json({
            success: false,
            error: `Invalid metricId: ${metricId}. Valid IDs: ${validMetricIds.join(', ')}`,
            code: 'INVALID_METRIC_ID',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const startTime = Date.now();
        await this.repos.stats.recordConversion(
          platform,
          environment,
          experimentKey,
          metricId,
          variationKey,
          userId,
          value
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation('recordConversion', 'stats', duration, true);
        logger.info(`Recorded conversion for ${experimentKey}/${variationKey}/${metricId}`);

        res.json({
          success: true,
          data: {
            recorded: true,
          },
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
}
