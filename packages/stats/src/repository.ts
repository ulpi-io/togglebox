/**
 * @togglebox/stats - Repository Interface
 *
 * Defines the contract for statistics storage operations.
 * Implementations exist for Prisma, DynamoDB, Mongoose, and D1.
 */

import type {
  ConfigStats,
  FlagStats,
  FlagStatsByCountry,
  FlagStatsDaily,
  ExperimentStats,
  ExperimentMetricStats,
  StatsEvent,
} from "./types";

/**
 * Repository interface for statistics operations.
 *
 * @remarks
 * Stats are updated incrementally using atomic operations.
 * Implementations should use atomic counters where possible.
 */
export interface IStatsRepository {
  // =========================================================================
  // CONFIG STATS
  // =========================================================================

  /**
   * Increment fetch count for a Remote Config.
   */
  incrementConfigFetch(
    platform: string,
    environment: string,
    configKey: string,
    clientId?: string,
  ): Promise<void>;

  /**
   * Get stats for a Remote Config.
   */
  getConfigStats(
    platform: string,
    environment: string,
    configKey: string,
  ): Promise<ConfigStats | null>;

  // =========================================================================
  // FLAG STATS
  // =========================================================================

  /**
   * Increment evaluation count for a Feature Flag.
   *
   * @param value - 'A' or 'B' indicating which value was served
   * @param userId - User ID for unique user tracking
   * @param country - Optional country for geographic breakdown
   */
  incrementFlagEvaluation(
    platform: string,
    environment: string,
    flagKey: string,
    value: "A" | "B",
    userId: string,
    country?: string,
  ): Promise<void>;

  /**
   * Get stats for a Feature Flag.
   */
  getFlagStats(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<FlagStats | null>;

  /**
   * Get country breakdown for a Feature Flag.
   */
  getFlagStatsByCountry(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<FlagStatsByCountry[]>;

  /**
   * Get daily time series for a Feature Flag.
   *
   * @param days - Number of days to retrieve (default: 30)
   */
  getFlagStatsDaily(
    platform: string,
    environment: string,
    flagKey: string,
    days?: number,
  ): Promise<FlagStatsDaily[]>;

  // =========================================================================
  // EXPERIMENT STATS
  // =========================================================================

  /**
   * Record an experiment exposure.
   */
  recordExperimentExposure(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    userId: string,
  ): Promise<void>;

  /**
   * Record a conversion event.
   *
   * @param value - Optional numeric value for sum/revenue metrics
   */
  recordConversion(
    platform: string,
    environment: string,
    experimentKey: string,
    metricId: string,
    variationKey: string,
    userId: string,
    value?: number,
  ): Promise<void>;

  /**
   * Get full stats for an Experiment.
   */
  getExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<ExperimentStats | null>;

  /**
   * Get metric stats for a specific variation and metric.
   */
  getExperimentMetricStats(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    metricId: string,
  ): Promise<ExperimentMetricStats[]>;

  // =========================================================================
  // BATCH PROCESSING
  // =========================================================================

  /**
   * Process a batch of events from SDK.
   * More efficient than individual calls.
   */
  processBatch(
    platform: string,
    environment: string,
    events: StatsEvent[],
  ): Promise<void>;

  // =========================================================================
  // CLEANUP
  // =========================================================================

  /**
   * Delete all stats for a Remote Config.
   */
  deleteConfigStats(
    platform: string,
    environment: string,
    configKey: string,
  ): Promise<void>;

  /**
   * Delete all stats for a Feature Flag.
   */
  deleteFlagStats(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<void>;

  /**
   * Delete all stats for an Experiment.
   */
  deleteExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<void>;
}
