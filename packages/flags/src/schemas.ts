/**
 * @togglebox/flags - Feature Flag Schemas
 *
 * Feature Flags have exactly 2 values (A/B) with geographic targeting.
 * For multi-variant testing (3+ variants), use Experiments instead.
 */

import { z } from 'zod';

/**
 * Flag value types - boolean, string, or number.
 * JSON is not supported for flags (use Remote Configs for complex values).
 */
export const FlagValueTypeEnum = z.enum(['boolean', 'string', 'number']);
export type FlagValueType = z.infer<typeof FlagValueTypeEnum>;

/**
 * Schema for flag values.
 */
export const FlagValueSchema = z.union([z.boolean(), z.string(), z.number()]);
export type FlagValue = z.infer<typeof FlagValueSchema>;

/**
 * Schema for language-level targeting within a country.
 */
export const LanguageTargetSchema = z.object({
  language: z.string().length(2, 'Language must be ISO-639 2-letter code'),
  serveValue: z.enum(['A', 'B']),
});
export type LanguageTarget = z.infer<typeof LanguageTargetSchema>;

/**
 * Schema for country-level targeting with optional language overrides.
 */
export const CountryTargetSchema = z.object({
  country: z.string().length(2, 'Country must be ISO-3166 2-letter code'),
  serveValue: z.enum(['A', 'B']),
  languages: z.array(LanguageTargetSchema).optional(),
});
export type CountryTarget = z.infer<typeof CountryTargetSchema>;

/**
 * Schema for targeting configuration.
 */
export const TargetingSchema = z.object({
  // Geographic targeting (country -> language hierarchy)
  countries: z.array(CountryTargetSchema).default([]),

  // Force include/exclude (highest priority)
  forceIncludeUsers: z.array(z.string()).default([]), // Always serve valueA
  forceExcludeUsers: z.array(z.string()).default([]), // Always serve valueB
});
export type Targeting = z.infer<typeof TargetingSchema>;

/**
 * Schema for Feature Flag objects.
 *
 * @remarks
 * Feature Flags have exactly 2 values (valueA and valueB) with geographic targeting
 * and optional percentage-based rollout.
 *
 * **Evaluation Priority:**
 * 1. Flag disabled → serve defaultValue
 * 2. forceExcludeUsers → serve valueB
 * 3. forceIncludeUsers → serve valueA
 * 4. Country + Language match → serve language-specific value
 * 5. Country match (no language) → serve country value
 * 6. Percentage rollout (if enabled) → hash-based assignment
 * 7. No match → serve defaultValue
 *
 * @example
 * ```ts
 * const flag: FeatureFlag = {
 *   platform: 'web',
 *   environment: 'production',
 *   flagKey: 'dark-mode',
 *   name: 'Dark Mode Toggle',
 *   description: 'Enable dark mode for users',
 *   enabled: true,
 *   flagType: 'boolean',
 *   valueA: true,
 *   valueB: false,
 *   targeting: {
 *     countries: [
 *       { country: 'US', serveValue: 'A' },
 *       { country: 'DE', serveValue: 'B' },
 *     ],
 *     forceIncludeUsers: ['beta-tester-1'],
 *     forceExcludeUsers: ['problematic-user'],
 *   },
 *   defaultValue: 'B',
 *   version: '1.0.0',
 *   isActive: true,
 *   createdBy: 'admin@example.com',
 *   createdAt: '2025-01-01T00:00:00Z',
 *   updatedAt: '2025-01-01T00:00:00Z',
 * };
 * ```
 */
export const FlagSchema = z.object({
  // Identity
  platform: z.string().min(1, 'Platform is required'),
  environment: z.string().min(1, 'Environment is required'),
  flagKey: z.string().min(1, 'Flag key is required').regex(
    /^[a-z][a-z0-9_-]*$/,
    'Flag key must be lowercase, start with a letter, and contain only letters, numbers, underscores, and hyphens'
  ),

  // Metadata
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),

  // State
  enabled: z.boolean().default(false), // Master switch: false = always serve defaultValue

  // Type & Values (EXACTLY 2 VALUES)
  flagType: FlagValueTypeEnum.default('boolean'),
  valueA: FlagValueSchema, // Primary value (when conditions match)
  valueB: FlagValueSchema, // Secondary value (default/fallback)

  // Targeting (country → language hierarchy)
  targeting: TargetingSchema.default({
    countries: [],
    forceIncludeUsers: [],
    forceExcludeUsers: [],
  }),

  // Default (when no targeting matches)
  defaultValue: z.enum(['A', 'B']).default('B'),

  // Percentage Rollout
  // When enabled, users are assigned to A or B based on hash(flagKey + userId)
  rolloutEnabled: z.boolean().default(false),
  rolloutPercentageA: z.number().min(0).max(100).default(100), // Percentage for valueA (0-100)
  rolloutPercentageB: z.number().min(0).max(100).default(0),   // Percentage for valueB (auto-calculated as 100 - A)

  // Versioning
  version: z.string().default('1.0.0'),
  isActive: z.boolean().default(true),

  // Audit
  createdBy: z.string().email('Invalid email format'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Flag = z.infer<typeof FlagSchema>;

/**
 * Schema for creating a new Flag.
 */
export const CreateFlagSchema = FlagSchema.omit({
  version: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // For boolean flags, provide sensible defaults
  valueA: FlagValueSchema.optional(),
  valueB: FlagValueSchema.optional(),
}).transform((data) => {
  // For boolean flags without explicit values, use true/false
  if (data.flagType === 'boolean') {
    return {
      ...data,
      valueA: data.valueA ?? true,
      valueB: data.valueB ?? false,
    };
  }
  // For other types, values are required
  if (data.valueA === undefined || data.valueB === undefined) {
    throw new Error(`valueA and valueB are required for ${data.flagType} flags`);
  }
  return data as typeof data & { valueA: FlagValue; valueB: FlagValue };
});

export type CreateFlag = z.infer<typeof CreateFlagSchema>;

/**
 * Schema for updating a Flag (creates new version).
 */
export const UpdateFlagSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  valueA: FlagValueSchema.optional(),
  valueB: FlagValueSchema.optional(),
  targeting: TargetingSchema.optional(),
  defaultValue: z.enum(['A', 'B']).optional(),
  // Percentage rollout
  rolloutEnabled: z.boolean().optional(),
  rolloutPercentageA: z.number().min(0).max(100).optional(),
  rolloutPercentageB: z.number().min(0).max(100).optional(),
  createdBy: z.string().email('Invalid email format'),
});

/**
 * Schema for updating rollout settings (in-place, no new version).
 */
export const UpdateRolloutSchema = z.object({
  rolloutEnabled: z.boolean().optional(),
  rolloutPercentageA: z.number().min(0).max(100).optional(),
  rolloutPercentageB: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    // If both percentages are provided, they must sum to 100
    if (data.rolloutPercentageA !== undefined && data.rolloutPercentageB !== undefined) {
      return data.rolloutPercentageA + data.rolloutPercentageB === 100;
    }
    return true;
  },
  { message: 'rolloutPercentageA + rolloutPercentageB must equal 100' }
);

export type UpdateFlag = z.infer<typeof UpdateFlagSchema>;

export type UpdateRollout = z.infer<typeof UpdateRolloutSchema>;

/**
 * Schema for toggling a flag's enabled state.
 */
export const ToggleFlagSchema = z.object({
  enabled: z.boolean(),
});

export type ToggleFlag = z.infer<typeof ToggleFlagSchema>;

/**
 * Schema for evaluation context.
 */
export const EvaluationContextSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  country: z.string().length(2).optional(),
  language: z.string().length(2).optional(),
});

export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

/**
 * Schema for evaluation result.
 */
export const EvaluationResultSchema = z.object({
  flagKey: z.string(),
  value: FlagValueSchema,
  servedValue: z.enum(['A', 'B']),
  reason: z.string(),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
