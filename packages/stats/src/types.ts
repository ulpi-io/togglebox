/**
 * @togglebox/stats - Statistics Types
 *
 * Types for tracking stats across all three tiers:
 * - Remote Configs: fetch counts
 * - Feature Flags: evaluation counts per value
 * - Experiments: exposures, conversions, metrics
 */

import { z } from 'zod';

// ============================================================================
// REMOTE CONFIG STATS
// ============================================================================

/**
 * Stats for a Remote Config.
 */
export const ConfigStatsSchema = z.object({
  platform: z.string(),
  environment: z.string(),
  configKey: z.string(),

  fetchCount: z.number().int().nonnegative().default(0),
  lastFetchedAt: z.string().datetime().optional(),
  uniqueClients24h: z.number().int().nonnegative().default(0),

  updatedAt: z.string().datetime(),
});

export type ConfigStats = z.infer<typeof ConfigStatsSchema>;

// ============================================================================
// FEATURE FLAG STATS
// ============================================================================

/**
 * Stats for a Feature Flag (per value A/B).
 */
export const FlagStatsSchema = z.object({
  platform: z.string(),
  environment: z.string(),
  flagKey: z.string(),

  // Evaluation counts
  totalEvaluations: z.number().int().nonnegative().default(0),
  valueACount: z.number().int().nonnegative().default(0),
  valueBCount: z.number().int().nonnegative().default(0),

  // Unique users (approximate via HyperLogLog in implementations)
  uniqueUsersA24h: z.number().int().nonnegative().default(0),
  uniqueUsersB24h: z.number().int().nonnegative().default(0),

  lastEvaluatedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});

export type FlagStats = z.infer<typeof FlagStatsSchema>;

/**
 * Country-level breakdown for flag stats.
 */
export const FlagStatsByCountrySchema = z.object({
  country: z.string(),
  valueACount: z.number().int().nonnegative(),
  valueBCount: z.number().int().nonnegative(),
});

export type FlagStatsByCountry = z.infer<typeof FlagStatsByCountrySchema>;

/**
 * Daily time series for flag stats.
 */
export const FlagStatsDailySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  valueACount: z.number().int().nonnegative(),
  valueBCount: z.number().int().nonnegative(),
});

export type FlagStatsDaily = z.infer<typeof FlagStatsDailySchema>;

// ============================================================================
// EXPERIMENT STATS
// ============================================================================

/**
 * Stats for an Experiment variation.
 */
export const ExperimentVariationStatsSchema = z.object({
  variationKey: z.string(),
  participants: z.number().int().nonnegative().default(0),
  exposures: z.number().int().nonnegative().default(0),
});

export type ExperimentVariationStats = z.infer<typeof ExperimentVariationStatsSchema>;

/**
 * Stats for an Experiment metric (per variation).
 */
export const ExperimentMetricStatsSchema = z.object({
  platform: z.string(),
  environment: z.string(),
  experimentKey: z.string(),
  variationKey: z.string(),
  metricId: z.string(),
  date: z.string(), // YYYY-MM-DD for daily aggregation

  // Raw data
  sampleSize: z.number().int().nonnegative().default(0),
  sum: z.number().default(0), // For sum/average metrics
  count: z.number().int().nonnegative().default(0), // For count metrics
  conversions: z.number().int().nonnegative().default(0), // For conversion metrics

  // Computed (optional, calculated on read)
  mean: z.number().optional(),
  variance: z.number().optional(),
  standardError: z.number().optional(),
});

export type ExperimentMetricStats = z.infer<typeof ExperimentMetricStatsSchema>;

/**
 * Daily time series for experiment stats.
 */
export const ExperimentStatsDailySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  variationKey: z.string(),
  participants: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
});

export type ExperimentStatsDaily = z.infer<typeof ExperimentStatsDailySchema>;

/**
 * Full experiment stats summary.
 */
export const ExperimentStatsSchema = z.object({
  platform: z.string(),
  environment: z.string(),
  experimentKey: z.string(),

  // Participation
  variations: z.array(ExperimentVariationStatsSchema),

  // Metrics (per variation, per metric)
  metricResults: z.array(ExperimentMetricStatsSchema),

  // Time series
  dailyData: z.array(ExperimentStatsDailySchema),

  updatedAt: z.string().datetime(),
});

export type ExperimentStats = z.infer<typeof ExperimentStatsSchema>;

// ============================================================================
// SDK EVENTS
// ============================================================================

/**
 * Event types sent by SDKs.
 */
export const StatsEventTypeEnum = z.enum([
  'config_fetch',
  'flag_evaluation',
  'experiment_exposure',
  'conversion',
  'custom_event',
]);

export type StatsEventType = z.infer<typeof StatsEventTypeEnum>;

/**
 * Base event schema (common fields).
 */
const BaseEventSchema = z.object({
  type: StatsEventTypeEnum,
  timestamp: z.string().datetime(),
  clientId: z.string().optional(), // For unique client tracking
});

/**
 * Config fetch event.
 */
export const ConfigFetchEventSchema = BaseEventSchema.extend({
  type: z.literal('config_fetch'),
  key: z.string(),
});

export type ConfigFetchEvent = z.infer<typeof ConfigFetchEventSchema>;

/**
 * Flag evaluation event.
 */
export const FlagEvaluationEventSchema = BaseEventSchema.extend({
  type: z.literal('flag_evaluation'),
  flagKey: z.string(),
  value: z.enum(['A', 'B']),
  userId: z.string(),
  country: z.string().optional(),
  language: z.string().optional(),
});

export type FlagEvaluationEvent = z.infer<typeof FlagEvaluationEventSchema>;

/**
 * Experiment exposure event.
 */
export const ExperimentExposureEventSchema = BaseEventSchema.extend({
  type: z.literal('experiment_exposure'),
  experimentKey: z.string(),
  variationKey: z.string(),
  userId: z.string(),
});

export type ExperimentExposureEvent = z.infer<typeof ExperimentExposureEventSchema>;

/**
 * Conversion event.
 */
export const ConversionEventSchema = BaseEventSchema.extend({
  type: z.literal('conversion'),
  experimentKey: z.string(),
  metricName: z.string(),
  variationKey: z.string(), // Required: which variation the user was assigned to
  userId: z.string(),
  value: z.number().optional(), // For revenue/sum metrics
});

export type ConversionEvent = z.infer<typeof ConversionEventSchema>;

/**
 * Custom event.
 */
export const CustomEventSchema = BaseEventSchema.extend({
  type: z.literal('custom_event'),
  eventName: z.string(),
  userId: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

export type CustomEvent = z.infer<typeof CustomEventSchema>;

/**
 * Union of all event types.
 */
export const StatsEventSchema = z.discriminatedUnion('type', [
  ConfigFetchEventSchema,
  FlagEvaluationEventSchema,
  ExperimentExposureEventSchema,
  ConversionEventSchema,
  CustomEventSchema,
]);

export type StatsEvent = z.infer<typeof StatsEventSchema>;

/**
 * Batch of events from SDK.
 */
export const StatsEventBatchSchema = z.object({
  events: z.array(StatsEventSchema).min(1).max(100),
});

export type StatsEventBatch = z.infer<typeof StatsEventBatchSchema>;
