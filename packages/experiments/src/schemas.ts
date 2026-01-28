/**
 * @togglebox/experiments - Experiment Schemas
 *
 * Experiments support multiple variants (2+) with traffic allocation,
 * metrics tracking, and statistical analysis.
 */

import { z } from "zod";

// ============================================================================
// TARGETING (shared with flags)
// ============================================================================

/**
 * Schema for language-level targeting within a country.
 */
export const LanguageTargetSchema = z.object({
  language: z.string().length(2, "Language must be ISO-639 2-letter code"),
});
export type LanguageTarget = z.infer<typeof LanguageTargetSchema>;

/**
 * Schema for country-level targeting.
 */
export const CountryTargetSchema = z.object({
  country: z.string().length(2, "Country must be ISO-3166 2-letter code"),
  languages: z.array(LanguageTargetSchema).optional(),
});
export type CountryTarget = z.infer<typeof CountryTargetSchema>;

/**
 * Schema for experiment targeting.
 */
export const ExperimentTargetingSchema = z.object({
  // Geographic targeting
  countries: z.array(CountryTargetSchema).default([]),

  // Force include/exclude
  forceIncludeUsers: z.array(z.string()).default([]), // Always include in experiment
  forceExcludeUsers: z.array(z.string()).default([]), // Never include in experiment
});
export type ExperimentTargeting = z.infer<typeof ExperimentTargetingSchema>;

// ============================================================================
// VARIATIONS
// ============================================================================

/**
 * Schema for experiment variation values (any JSON).
 */
export const VariationValueSchema = z.unknown();
export type VariationValue = z.infer<typeof VariationValueSchema>;

/**
 * Schema for an experiment variation.
 */
export const ExperimentVariationSchema = z.object({
  key: z
    .string()
    .min(1, "Variation key is required")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Variation key must be lowercase, start with a letter, and contain only letters, numbers, and underscores",
    ),
  name: z.string().min(1, "Variation name is required"),
  value: VariationValueSchema,
  isControl: z.boolean().default(false),
});
export type ExperimentVariation = z.infer<typeof ExperimentVariationSchema>;

/**
 * Schema for traffic allocation per variation.
 */
export const TrafficAllocationSchema = z.object({
  variationKey: z.string(),
  percentage: z.number().min(0).max(100),
});
export type TrafficAllocation = z.infer<typeof TrafficAllocationSchema>;

// ============================================================================
// METRICS
// ============================================================================

/**
 * Metric types for experiments.
 */
export const MetricTypeEnum = z.enum(["conversion", "count", "sum", "average"]);
export type MetricType = z.infer<typeof MetricTypeEnum>;

/**
 * Success direction for metrics.
 */
export const SuccessDirectionEnum = z.enum(["increase", "decrease"]);
export type SuccessDirection = z.infer<typeof SuccessDirectionEnum>;

/**
 * Schema for metric configuration.
 */
export const MetricConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Metric name is required"),
  eventName: z.string().min(1, "Event name is required"),
  metricType: MetricTypeEnum,
  successDirection: SuccessDirectionEnum,
  valueProperty: z.string().optional(), // For numeric metrics (e.g., "revenue")
});
export type MetricConfig = z.infer<typeof MetricConfigSchema>;

// ============================================================================
// RESULTS
// ============================================================================

/**
 * Experiment result status.
 */
export const ResultStatusEnum = z.enum([
  "collecting",
  "significant",
  "not_significant",
  "inconclusive",
]);
export type ResultStatus = z.infer<typeof ResultStatusEnum>;

/**
 * Schema for variation results.
 */
export const VariationResultSchema = z.object({
  variationKey: z.string(),
  participants: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1),
  relativeLift: z.number().optional(), // vs control
  confidenceInterval: z.tuple([z.number(), z.number()]).optional(),
});
export type VariationResult = z.infer<typeof VariationResultSchema>;

/**
 * Schema for experiment results (computed).
 */
export const ExperimentResultsSchema = z.object({
  status: ResultStatusEnum,
  lastUpdatedAt: z.string().datetime(),

  totalParticipants: z.number().int().nonnegative(),
  totalConversions: z.number().int().nonnegative(),

  variations: z.array(VariationResultSchema),

  // Statistical
  pValue: z.number().optional(),
  isSignificant: z.boolean(),
  sampleRatioMismatch: z.boolean().optional(),
  warnings: z.array(z.string()).optional(),
});
export type ExperimentResults = z.infer<typeof ExperimentResultsSchema>;

// ============================================================================
// EXPERIMENT STATUS
// ============================================================================

/**
 * Experiment lifecycle status.
 */
export const ExperimentStatusEnum = z.enum([
  "draft",
  "running",
  "paused",
  "completed",
  "archived",
]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusEnum>;

// ============================================================================
// EXPERIMENT
// ============================================================================

/**
 * Base schema for Experiment objects (without refinements).
 * Used for creating derived schemas like CreateExperimentSchema.
 */
const ExperimentBaseSchema = z.object({
  // Identity
  platform: z.string().min(1, "Platform is required"),
  environment: z.string().min(1, "Environment is required"),
  experimentKey: z
    .string()
    .min(1, "Experiment key is required")
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      "Experiment key must be lowercase, start with a letter, and contain only letters, numbers, underscores, and hyphens",
    ),

  // Metadata
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  hypothesis: z.string().min(1, "Hypothesis is required"),

  // Lifecycle
  status: ExperimentStatusEnum.default("draft"),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),

  // Variations (2+ variants)
  variations: z
    .array(ExperimentVariationSchema)
    .min(2, "At least 2 variations required"),
  controlVariation: z.string().min(1, "Control variation is required"),

  // Traffic allocation
  trafficAllocation: z.array(TrafficAllocationSchema).min(2),

  // Targeting (same as flags)
  targeting: ExperimentTargetingSchema.default({
    countries: [],
    forceIncludeUsers: [],
    forceExcludeUsers: [],
  }),

  // Metrics
  primaryMetric: MetricConfigSchema,
  secondaryMetrics: z.array(MetricConfigSchema).optional(),

  // Statistical configuration
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  minimumDetectableEffect: z.number().min(0.01).max(1).optional(),
  minimumSampleSize: z.number().int().positive().optional(),

  // Results (computed, read-only)
  results: ExperimentResultsSchema.optional(),
  winner: z.string().optional(), // Variation key of winner

  // Versioning
  version: z.string().default("1.0.0"),
  isActive: z.boolean().default(true),

  // Audit
  createdBy: z.string().email("Invalid email format"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema for Experiment objects.
 *
 * @remarks
 * Experiments support multiple variants (2+) with traffic allocation,
 * metrics tracking, and statistical analysis.
 *
 * @example
 * ```ts
 * const experiment: Experiment = {
 *   platform: 'web',
 *   environment: 'production',
 *   experimentKey: 'checkout-test',
 *   name: 'Checkout Flow Experiment',
 *   description: 'Testing new single-page checkout',
 *   hypothesis: 'Single-page checkout will increase conversions by 10%',
 *   status: 'running',
 *   variations: [
 *     { key: 'control', name: 'Classic Checkout', value: { layout: 'multi-page' }, isControl: true },
 *     { key: 'treatment_a', name: 'Single Page', value: { layout: 'single-page' }, isControl: false },
 *     { key: 'treatment_b', name: 'Express', value: { layout: 'express' }, isControl: false },
 *   ],
 *   controlVariation: 'control',
 *   trafficAllocation: [
 *     { variationKey: 'control', percentage: 34 },
 *     { variationKey: 'treatment_a', percentage: 33 },
 *     { variationKey: 'treatment_b', percentage: 33 },
 *   ],
 *   primaryMetric: {
 *     id: 'purchase',
 *     name: 'Purchase Conversion',
 *     eventName: 'purchase',
 *     metricType: 'conversion',
 *     successDirection: 'increase',
 *   },
 *   confidenceLevel: 0.95,
 *   version: '1.0.0',
 *   isActive: true,
 *   createdBy: 'product@example.com',
 *   createdAt: '2025-01-01T00:00:00Z',
 *   updatedAt: '2025-01-01T00:00:00Z',
 * };
 * ```
 */
export const ExperimentSchema = ExperimentBaseSchema.refine(
  (data) => {
    // Validate traffic allocation sums to 100
    const total = data.trafficAllocation.reduce(
      (sum, t) => sum + t.percentage,
      0,
    );
    return Math.abs(total - 100) < 0.01;
  },
  { message: "Traffic allocation must sum to 100%" },
)
  .refine(
    (data) => {
      // Validate control variation exists
      return data.variations.some((v) => v.key === data.controlVariation);
    },
    { message: "Control variation must exist in variations" },
  )
  .refine(
    (data) => {
      // Validate all traffic allocation keys exist
      const variationKeys = new Set(data.variations.map((v) => v.key));
      return data.trafficAllocation.every((t) =>
        variationKeys.has(t.variationKey),
      );
    },
    { message: "All traffic allocation keys must exist in variations" },
  );

export type Experiment = z.infer<typeof ExperimentSchema>;

/**
 * Schema for creating a new Experiment.
 *
 * @remarks
 * Includes the same validation refinements as ExperimentSchema:
 * - Traffic allocation must sum to 100%
 * - Control variation must exist in variations
 * - All traffic allocation keys must exist in variations
 */
export const CreateExperimentSchema = ExperimentBaseSchema.omit({
  version: true,
  isActive: true,
  status: true,
  startedAt: true,
  completedAt: true,
  results: true,
  winner: true,
  createdAt: true,
  updatedAt: true,
})
  .refine(
    (data) => {
      // Validate traffic allocation sums to 100
      const total = data.trafficAllocation.reduce(
        (sum, t) => sum + t.percentage,
        0,
      );
      return Math.abs(total - 100) < 0.01;
    },
    { message: "Traffic allocation must sum to 100%" },
  )
  .refine(
    (data) => {
      // Validate control variation exists
      return data.variations.some((v) => v.key === data.controlVariation);
    },
    { message: "Control variation must exist in variations" },
  )
  .refine(
    (data) => {
      // Validate all traffic allocation keys exist
      const variationKeys = new Set(data.variations.map((v) => v.key));
      return data.trafficAllocation.every((t) =>
        variationKeys.has(t.variationKey),
      );
    },
    { message: "All traffic allocation keys must exist in variations" },
  );

export type CreateExperiment = z.infer<typeof CreateExperimentSchema>;

/**
 * Schema for updating an Experiment.
 *
 * @remarks
 * Includes validation refinements for consistency when updating:
 * - If trafficAllocation is provided, it must sum to 100%
 * - If controlVariation is provided with variations, control must exist
 * - If trafficAllocation is provided with variations, keys must exist
 */
export const UpdateExperimentSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    variations: z.array(ExperimentVariationSchema).min(2).optional(),
    controlVariation: z.string().optional(),
    trafficAllocation: z.array(TrafficAllocationSchema).min(2).optional(),
    targeting: ExperimentTargetingSchema.optional(),
    primaryMetric: MetricConfigSchema.optional(),
    secondaryMetrics: z.array(MetricConfigSchema).optional(),
    confidenceLevel: z.number().min(0.8).max(0.99).optional(),
    minimumDetectableEffect: z.number().min(0.01).max(1).optional(),
    minimumSampleSize: z.number().int().positive().optional(),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().optional(),
    createdBy: z.string().email("Invalid email format"),
  })
  .refine(
    (data) => {
      // If trafficAllocation is provided, it must sum to 100%
      if (!data.trafficAllocation) return true;
      const total = data.trafficAllocation.reduce(
        (sum, t) => sum + t.percentage,
        0,
      );
      return Math.abs(total - 100) < 0.01;
    },
    { message: "Traffic allocation must sum to 100%" },
  )
  .refine(
    (data) => {
      // If both controlVariation and variations are provided, control must exist
      if (!data.controlVariation || !data.variations) return true;
      return data.variations.some((v) => v.key === data.controlVariation);
    },
    { message: "Control variation must exist in variations" },
  )
  .refine(
    (data) => {
      // If both trafficAllocation and variations are provided, keys must exist
      if (!data.trafficAllocation || !data.variations) return true;
      const variationKeys = new Set(data.variations.map((v) => v.key));
      return data.trafficAllocation.every((t) =>
        variationKeys.has(t.variationKey),
      );
    },
    { message: "All traffic allocation keys must exist in variations" },
  );

export type UpdateExperiment = z.infer<typeof UpdateExperimentSchema>;

/**
 * Schema for starting an experiment.
 */
export const StartExperimentSchema = z.object({
  startedBy: z.string().email(),
});

export type StartExperiment = z.infer<typeof StartExperimentSchema>;

/**
 * Schema for completing an experiment with a winner.
 */
export const CompleteExperimentSchema = z.object({
  winner: z.string().optional(), // Variation key, or undefined for no winner
  completedBy: z.string().email(),
});

export type CompleteExperiment = z.infer<typeof CompleteExperimentSchema>;

// ============================================================================
// EVALUATION
// ============================================================================

/**
 * Schema for experiment evaluation context.
 */
export const ExperimentContextSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  country: z.string().length(2).optional(),
  language: z.string().length(2).optional(),
});

export type ExperimentContext = z.infer<typeof ExperimentContextSchema>;

/**
 * Schema for experiment evaluation result (variant assignment).
 */
export const VariantAssignmentSchema = z.object({
  experimentKey: z.string(),
  variationKey: z.string(),
  value: VariationValueSchema,
  isControl: z.boolean(),
  reason: z.string(),
});

export type VariantAssignment = z.infer<typeof VariantAssignmentSchema>;
