/**
 * @togglebox/flags - Flag Evaluator
 *
 * Evaluates feature flags based on targeting rules and percentage rollout.
 * Returns valueA or valueB based on the evaluation context.
 */

import { getPercentage } from '@togglebox/core';
import type {
  Flag,
  EvaluationContext,
  EvaluationResult,
  FlagValue,
} from './schemas';

/**
 * Evaluation reasons for debugging.
 */
export const EvaluationReason = {
  FLAG_DISABLED: 'Flag is disabled - serving default value',
  FORCE_EXCLUDED: 'User is in force exclude list - serving valueB',
  FORCE_INCLUDED: 'User is in force include list - serving valueA',
  COUNTRY_LANGUAGE_MATCH: 'Matched country and language targeting',
  COUNTRY_MATCH: 'Matched country targeting',
  ROLLOUT_PERCENTAGE: 'Assigned via percentage rollout',
  DEFAULT: 'No targeting matched - serving default value',
} as const;

/**
 * Evaluate a flag for a given context.
 *
 * @param flag - The flag to evaluate
 * @param context - The evaluation context (userId, country, language)
 * @returns The evaluation result with value, served value (A/B), and reason
 *
 * @remarks
 * Evaluation priority:
 * 1. If flag is disabled → serve defaultValue
 * 2. If user is in forceExcludeUsers → serve valueB
 * 3. If user is in forceIncludeUsers → serve valueA
 * 4. If country + language matches → serve language-specific value
 * 5. If country matches (no language override) → serve country value
 * 6. If rollout enabled → hash-based percentage assignment
 * 7. No match → serve defaultValue
 */
export function evaluateFlag(
  flag: Flag,
  context: EvaluationContext
): EvaluationResult {
  const { userId, country, language } = context;
  const { targeting, defaultValue } = flag;

  // Helper to get the actual value
  const getValue = (which: 'A' | 'B'): FlagValue => {
    return which === 'A' ? flag.valueA : flag.valueB;
  };

  // 1. Check if flag is disabled
  if (!flag.enabled) {
    return {
      flagKey: flag.flagKey,
      value: getValue(defaultValue),
      servedValue: defaultValue,
      reason: EvaluationReason.FLAG_DISABLED,
    };
  }

  // 2. Check force exclude list (highest priority for exclusion)
  if (targeting.forceExcludeUsers.includes(userId)) {
    return {
      flagKey: flag.flagKey,
      value: getValue('B'),
      servedValue: 'B',
      reason: EvaluationReason.FORCE_EXCLUDED,
    };
  }

  // 3. Check force include list (highest priority for inclusion)
  if (targeting.forceIncludeUsers.includes(userId)) {
    return {
      flagKey: flag.flagKey,
      value: getValue('A'),
      servedValue: 'A',
      reason: EvaluationReason.FORCE_INCLUDED,
    };
  }

  // 4. Check country + language targeting
  if (country) {
    const countryTarget = targeting.countries.find(
      (c) => c.country.toUpperCase() === country.toUpperCase()
    );

    if (countryTarget) {
      // Check for language-specific override
      if (language && countryTarget.languages) {
        const languageTarget = countryTarget.languages.find(
          (l) => l.language.toLowerCase() === language.toLowerCase()
        );

        if (languageTarget) {
          return {
            flagKey: flag.flagKey,
            value: getValue(languageTarget.serveValue),
            servedValue: languageTarget.serveValue,
            reason: EvaluationReason.COUNTRY_LANGUAGE_MATCH,
          };
        }
      }

      // No language override, use country value
      return {
        flagKey: flag.flagKey,
        value: getValue(countryTarget.serveValue),
        servedValue: countryTarget.serveValue,
        reason: EvaluationReason.COUNTRY_MATCH,
      };
    }
  }

  // 5. Check percentage rollout (if enabled)
  if (flag.rolloutEnabled) {
    const userPercentage = getPercentage(flag.flagKey, userId);
    const rolloutPercentageA = flag.rolloutPercentageA ?? 100;

    // User gets valueA if their percentage is below the rollout threshold
    const servedValue: 'A' | 'B' = userPercentage < rolloutPercentageA ? 'A' : 'B';

    return {
      flagKey: flag.flagKey,
      value: getValue(servedValue),
      servedValue,
      reason: EvaluationReason.ROLLOUT_PERCENTAGE,
    };
  }

  // 6. No targeting matched - use default
  return {
    flagKey: flag.flagKey,
    value: getValue(defaultValue),
    servedValue: defaultValue,
    reason: EvaluationReason.DEFAULT,
  };
}

/**
 * Evaluate multiple flags at once.
 *
 * @param flags - Array of flags to evaluate
 * @param context - The evaluation context
 * @returns Map of flagKey to evaluation result
 */
export function evaluateMultipleFlags(
  flags: Flag[],
  context: EvaluationContext
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>();

  for (const flag of flags) {
    results.set(flag.flagKey, evaluateFlag(flag, context));
  }

  return results;
}

/**
 * Check if a boolean flag is enabled for a given context.
 * Convenience method for boolean flags.
 *
 * @param flag - The boolean flag to evaluate
 * @param context - The evaluation context
 * @returns true if valueA is served, false if valueB is served
 */
export function isEnabled(
  flag: Flag,
  context: EvaluationContext
): boolean {
  if (flag.flagType !== 'boolean') {
    throw new Error(
      `isEnabled() can only be used with boolean flags. Flag "${flag.flagKey}" is type "${flag.flagType}"`
    );
  }

  const result = evaluateFlag(flag, context);
  return result.value === true;
}

/**
 * Stats repository interface for tracking flag evaluations.
 * This is a minimal interface to avoid circular dependencies with @togglebox/stats.
 */
export interface IFlagStatsTracker {
  incrementFlagEvaluation(
    platform: string,
    environment: string,
    flagKey: string,
    value: 'A' | 'B',
    userId: string,
    country?: string
  ): Promise<void>;
}

/**
 * Evaluate a flag and track the evaluation in stats.
 *
 * @param flag - The flag to evaluate
 * @param context - The evaluation context (userId, country, language)
 * @param statsTracker - Optional stats tracker for recording the evaluation
 * @returns The evaluation result with value, served value (A/B), and reason
 *
 * @remarks
 * This function wraps `evaluateFlag` and adds optional stats tracking.
 * The tracking is fire-and-forget to avoid impacting evaluation latency.
 *
 * @example
 * ```ts
 * import { getThreeTierRepositories } from '@togglebox/database';
 *
 * const { stats } = getThreeTierRepositories();
 * const result = await evaluateFlagWithTracking(flag, context, stats);
 * ```
 */
export async function evaluateFlagWithTracking(
  flag: Flag,
  context: EvaluationContext,
  statsTracker?: IFlagStatsTracker
): Promise<EvaluationResult> {
  const result = evaluateFlag(flag, context);

  // Track evaluation via stats repository (fire and forget)
  if (statsTracker && context.userId) {
    statsTracker.incrementFlagEvaluation(
      flag.platform,
      flag.environment,
      flag.flagKey,
      result.servedValue,
      context.userId,
      context.country
    ).catch((error) => {
      // Log but don't throw - stats tracking should not affect evaluation
      console.error('Failed to track flag evaluation:', error);
    });
  }

  return result;
}
