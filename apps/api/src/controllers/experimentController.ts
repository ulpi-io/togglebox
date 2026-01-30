import { Request, Response, NextFunction } from "express";
import { ThreeTierRepositories } from "@togglebox/database";
import {
  logger,
  getTokenPaginationParams,
  withDatabaseContext,
  NotFoundError,
  ValidationError,
  BadRequestError,
  AuthenticatedRequest,
} from "@togglebox/shared";
import {
  CreateExperimentSchema,
  UpdateExperimentSchema,
  StartExperimentSchema,
  CompleteExperimentSchema,
  ExperimentContextSchema,
} from "@togglebox/experiments";
import { assignVariation } from "@togglebox/experiments";
import { calculateMultipleSignificance, checkSRM } from "@togglebox/stats";
import { CacheProvider } from "@togglebox/cache";
import { z } from "zod";

/**
 * Helper to classify errors and return appropriate HTTP status and response.
 * Uses custom error classes for reliable error type detection.
 */
function handleControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      details: error.errors.map((e) => e.message),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Custom error types (reliable detection)
  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error instanceof ValidationError || error instanceof BadRequestError) {
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unknown error - pass to global error handler
  next(error);
}

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
  createExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment } = req.params as {
        platform: string;
        environment: string;
      };
      const user = (req as AuthenticatedRequest).user;
      const createdBy = user?.email || "system@togglebox.dev";

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

        logger.logDatabaseOperation(
          "createExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Created experiment ${experiment.experimentKey} for ${platform}/${environment}`,
        );

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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
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
  updateExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };
      const user = (req as AuthenticatedRequest).user;
      const createdBy = user?.email || "system@togglebox.dev";

      const bodyData = UpdateExperimentSchema.parse({
        ...req.body,
        createdBy,
      });

      await withDatabaseContext(req, async () => {
        // Fetch current experiment to validate merged state
        const current = await this.repos.experiment.get(
          platform,
          environment,
          experimentKey,
        );
        if (!current) {
          throw new Error(`Experiment ${experimentKey} not found`);
        }

        // Merge update data with current data
        const mergedVariations = bodyData.variations ?? current.variations;
        const mergedControlVariation =
          bodyData.controlVariation ?? current.controlVariation;
        const mergedTrafficAllocation =
          bodyData.trafficAllocation ?? current.trafficAllocation;

        // Validate merged state: control variation must exist in variations
        const variationKeys = new Set(mergedVariations.map((v) => v.key));
        if (!variationKeys.has(mergedControlVariation)) {
          throw new Error(
            `Control variation "${mergedControlVariation}" does not exist in variations. Valid variations: ${[...variationKeys].join(", ")}`,
          );
        }

        // Validate merged state: all traffic allocation keys must exist in variations
        const invalidTrafficKeys = mergedTrafficAllocation
          .filter((t) => !variationKeys.has(t.variationKey))
          .map((t) => t.variationKey);
        if (invalidTrafficKeys.length > 0) {
          throw new Error(
            `Traffic allocation contains invalid variation keys: ${invalidTrafficKeys.join(", ")}. Valid variations: ${[...variationKeys].join(", ")}`,
          );
        }

        // Validate merged state: traffic allocation must sum to 100%
        const totalPercentage = mergedTrafficAllocation.reduce(
          (sum, t) => sum + t.percentage,
          0,
        );
        if (Math.abs(totalPercentage - 100) >= 0.01) {
          throw new Error(
            `Traffic allocation must sum to 100%, got ${totalPercentage}%`,
          );
        }

        const startTime = Date.now();
        const experiment = await this.repos.experiment.update(
          platform,
          environment,
          experimentKey,
          bodyData,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "updateExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Updated experiment ${experimentKey} for ${platform}/${environment}`,
        );

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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      handleControllerError(error, res, next);
    }
  };

  /**
   * Starts an experiment (draft → running).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/start
   */
  startExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };
      const { startedBy } = StartExperimentSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.start(
          platform,
          environment,
          experimentKey,
          startedBy,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "startExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Started experiment ${experimentKey} for ${platform}/${environment}`,
        );

        await this.invalidateExperimentCache(
          platform,
          environment,
          experimentKey,
        );

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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      handleControllerError(error, res, next);
    }
  };

  /**
   * Pauses an experiment (running → paused).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/pause
   */
  pauseExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.pause(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "pauseExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Paused experiment ${experimentKey} for ${platform}/${environment}`,
        );

        await this.invalidateExperimentCache(
          platform,
          environment,
          experimentKey,
        );

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      handleControllerError(error, res, next);
    }
  };

  /**
   * Resumes an experiment (paused → running).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/resume
   */
  resumeExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.resume(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "resumeExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Resumed experiment ${experimentKey} for ${platform}/${environment}`,
        );

        await this.invalidateExperimentCache(
          platform,
          environment,
          experimentKey,
        );

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      handleControllerError(error, res, next);
    }
  };

  /**
   * Completes an experiment with optional winner (running/paused → completed).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/complete
   */
  completeExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
          const current = await this.repos.experiment.get(
            platform,
            environment,
            experimentKey,
          );
          if (!current) {
            throw new Error(`Experiment ${experimentKey} not found`);
          }
          if (!current.variations.some((v) => v.key === winner)) {
            throw new Error(
              `Winner variation "${winner}" does not exist in experiment ${experimentKey}. Valid variations: ${current.variations.map((v) => v.key).join(", ")}`,
            );
          }
        }

        const startTime = Date.now();
        const experiment = await this.repos.experiment.complete(
          platform,
          environment,
          experimentKey,
          winner,
          completedBy,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "completeExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Completed experiment ${experimentKey} for ${platform}/${environment}, winner: ${winner || "none"}`,
        );

        await this.invalidateExperimentCache(
          platform,
          environment,
          experimentKey,
        );

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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      handleControllerError(error, res, next);
    }
  };

  /**
   * Archives an experiment (completed → archived).
   *
   * POST /platforms/:platform/environments/:environment/experiments/:experimentKey/archive
   */
  archiveExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.archive(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "archiveExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Archived experiment ${experimentKey} for ${platform}/${environment}`,
        );

        res.json({
          success: true,
          data: experiment,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: unknown) {
      handleControllerError(error, res, next);
    }
  };

  /**
   * Gets an experiment.
   *
   * GET /platforms/:platform/environments/:environment/experiments/:experimentKey
   */
  getExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.get(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "getExperiment",
          "experiments",
          duration,
          true,
        );

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: "Experiment not found",
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
  listExperiments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment } = req.params as {
        platform: string;
        environment: string;
      };
      const { status } = req.query;
      const pagination = getTokenPaginationParams(req);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const result = await this.repos.experiment.list(
          platform,
          environment,
          status as
            | "draft"
            | "running"
            | "paused"
            | "completed"
            | "archived"
            | undefined,
          pagination?.limit,
          pagination?.nextToken,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "listExperiments",
          "experiments",
          duration,
          true,
        );

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
  deleteExperiment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        await this.repos.experiment.delete(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "deleteExperiment",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Deleted experiment ${experimentKey} for ${platform}/${environment}`,
        );

        await this.invalidateExperimentCache(
          platform,
          environment,
          experimentKey,
        );

        res.status(204).send();
      });
    } catch (error: unknown) {
      handleControllerError(error, res, next);
    }
  };

  /**
   * Assigns a user to a variation (public GET endpoint).
   *
   * GET /platforms/:platform/environments/:environment/experiments/:experimentKey/assign
   */
  assignVariationPublic = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
        const experiment = await this.repos.experiment.get(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "getExperiment",
          "experiments",
          duration,
          true,
        );

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: "Experiment not found",
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
              reason: "User not eligible for experiment",
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
          context.userId,
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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
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
  assignVariation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      const context = ExperimentContextSchema.parse(req.body);

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.get(
          platform,
          environment,
          experimentKey,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "getExperiment",
          "experiments",
          duration,
          true,
        );

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: "Experiment not found",
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
              reason: "User not eligible for experiment",
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
          context.userId,
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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
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
  getExperimentResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      await withDatabaseContext(req, async () => {
        // Get experiment
        const experiment = await this.repos.experiment.get(
          platform,
          environment,
          experimentKey,
        );

        if (!experiment) {
          res.status(404).json({
            success: false,
            error: "Experiment not found",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get stats
        const stats = await this.repos.stats.getExperimentStats(
          platform,
          environment,
          experimentKey,
        );

        if (!stats || stats.variations.length < 2) {
          res.json({
            success: true,
            data: {
              experiment,
              stats: null,
              analysis: null,
              message: "Not enough data for analysis",
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
              experiment.primaryMetric.id,
            );

            const totalConversions = metricStats.reduce(
              (sum, m) => sum + m.conversions,
              0,
            );

            return {
              variationKey: v.variationKey,
              participants: v.views || v.participants,
              conversions: totalConversions,
            };
          }),
        );

        // Find control variation
        const controlData = variationData.find(
          (v) => v.variationKey === experiment.controlVariation,
        );
        const treatmentData = variationData.filter(
          (v) => v.variationKey !== experiment.controlVariation,
        );

        let significance = null;
        let perVariationSignificance: Map<
          string,
          {
            pValue: number;
            isSignificant: boolean;
            zScore: number;
            confidenceInterval: [number, number];
            relativeLift: number;
            controlConversionRate: number;
            treatmentConversionRate: number;
          }
        > | null = null;
        if (controlData && treatmentData.length > 0) {
          // Calculate significance for each treatment vs control
          perVariationSignificance = calculateMultipleSignificance(
            controlData,
            treatmentData,
            experiment.confidenceLevel,
          );
          // Use first treatment for backward-compatible top-level significance
          const firstResult = treatmentData[0]
            ? perVariationSignificance.get(treatmentData[0].variationKey)
            : null;
          significance = firstResult ?? null;
        }

        // Check for Sample Ratio Mismatch
        // SECURITY: Wrap in try/catch to prevent 500 errors from invalid data
        let srmResult = null;
        try {
          const expectedRatios = experiment.trafficAllocation.map(
            (t) => t.percentage / 100,
          );
          srmResult = checkSRM(variationData, expectedRatios);
        } catch (err) {
          logger.warn("SRM calculation failed", {
            experimentKey: experiment.experimentKey,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        res.json({
          success: true,
          data: {
            experiment,
            stats,
            analysis: {
              variationData,
              significance,
              perVariation: perVariationSignificance
                ? Object.fromEntries(perVariationSignificance)
                : null,
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
  updateTrafficAllocation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { platform, environment, experimentKey } = req.params as {
        platform: string;
        environment: string;
        experimentKey: string;
      };

      const TrafficAllocationUpdateSchema = z
        .object({
          trafficAllocation: z
            .array(
              z.object({
                variationKey: z.string().min(1, "Variation key is required"),
                percentage: z.number().min(0).max(100),
              }),
            )
            .min(2, "At least 2 variations required"),
        })
        .superRefine((data, ctx) => {
          // Validate that percentages sum to 100%
          const total = data.trafficAllocation.reduce(
            (sum, t) => sum + t.percentage,
            0,
          );
          if (Math.abs(total - 100) > 0.01) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Traffic allocation must sum to 100% (got ${total}%)`,
              path: ["trafficAllocation"],
            });
          }
        });

      const { trafficAllocation } = TrafficAllocationUpdateSchema.parse(
        req.body,
      );

      await withDatabaseContext(req, async () => {
        const startTime = Date.now();
        const experiment = await this.repos.experiment.updateTrafficAllocation(
          platform,
          environment,
          experimentKey,
          trafficAllocation,
        );
        const duration = Date.now() - startTime;

        logger.logDatabaseOperation(
          "updateTrafficAllocation",
          "experiments",
          duration,
          true,
        );
        logger.info(
          `Updated traffic allocation for experiment ${experimentKey} in ${platform}/${environment}`,
        );

        await this.invalidateExperimentCache(
          platform,
          environment,
          experimentKey,
        );

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
          error: "Validation failed",
          code: "VALIDATION_FAILED",
          details: error.errors.map(
            (err) => `${err.path.join(".")}: ${err.message}`,
          ),
          timestamp: new Date().toISOString(),
        });
        return;
      }
      handleControllerError(error, res, next);
    }
  };

  /**
   * Helper method to invalidate cache for an experiment.
   * Awaits cache invalidation to ensure client doesn't fetch stale data.
   */
  private async invalidateExperimentCache(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<void> {
    const cachePaths = [
      `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
      `/api/v1/platforms/${platform}/environments/${environment}/experiments`,
    ];

    try {
      await this.cacheProvider.invalidateCache(cachePaths);
    } catch (err: unknown) {
      // WARN level since stale cache affects data consistency
      // Don't fail the request - mutation succeeded
      logger.warn("Cache invalidation failed - stale data may be served", {
        paths: cachePaths,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
