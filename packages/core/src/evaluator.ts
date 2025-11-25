/**
 * Service for evaluating feature flags with phased rollout support.
 *
 * @remarks
 * Handles percentage-based rollouts, user targeting, and country/language segmentation.
 * Uses consistent hashing to ensure same user always gets same result for a given flag.
 *
 * **Evaluation Flow:**
 * 1. Check master enabled switch
 * 2. Simple toggles return enabled state immediately
 * 3. Phased rollout flags check for required context (userId, country, language)
 * 4. Apply filters (country, language)
 * 5. Check force-in/force-out lists
 * 6. Apply percentage rollout based on user hash
 *
 * **Graceful Degradation:**
 * - Missing userId for phased rollout → disabled with reason
 * - Missing country for country targeting → disabled with reason
 * - Missing language for language targeting → disabled with reason
 */

import { FeatureFlag } from './schemas';

/**
 * Evaluation context provided by the client.
 */
export interface EvaluationContext {
  userId?: string;
  country?: string;
  language?: string;
}

/**
 * Evaluation result with optional reason for debugging.
 */
export interface EvaluationResult {
  enabled: boolean;
  reason?: string;
}

/**
 * Generates consistent hash for percentage-based rollout.
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param flagName - Feature flag name
 * @param userId - User identifier
 * @returns Number between 0-99
 *
 * @remarks
 * Uses simple string hashing algorithm to ensure:
 * - Same inputs always produce same output (deterministic)
 * - Even distribution across percentage range
 * - Fast computation (no cryptographic overhead)
 *
 * The hash includes platform/environment/flag to ensure:
 * - Different flags can have different rollout cohorts
 * - Same percentage across environments yields different users
 */
function hashUserId(
  platform: string,
  environment: string,
  flagName: string,
  userId: string
): number {
  const input = `${platform}:${environment}:${flagName}:${userId}`;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash) % 100;
}

/**
 * Evaluates a single feature flag for a user.
 *
 * @param flag - Feature flag configuration
 * @param context - User context (userId, country, language)
 * @returns Evaluation result
 *
 * @remarks
 * **Return value:**
 * - Simple toggles: `{ enabled: boolean }` (no reason)
 * - Phased rollout: `{ enabled: boolean, reason: string }` (for debugging)
 *
 * **Graceful degradation:**
 * - If flag needs userId but not provided → `{ enabled: false, reason: "userId required for evaluation" }`
 * - If flag needs country but not provided → `{ enabled: false, reason: "country required for evaluation" }`
 * - If flag needs language but not provided → `{ enabled: false, reason: "language required for evaluation" }`
 *
 * @example
 * ```ts
 * // Simple toggle (always same result for all users)
 * const simpleFlag: FeatureFlag = {
 *   flagName: 'dark-mode',
 *   enabled: true,
 *   rolloutType: 'simple',
 *   // ... other fields
 * };
 * evaluateFeatureFlag(simpleFlag, {});
 * // => { enabled: true }
 *
 * // Percentage rollout (50% of users)
 * const percentageFlag: FeatureFlag = {
 *   flagName: 'new-ui',
 *   enabled: true,
 *   rolloutType: 'percentage',
 *   rolloutPercentage: 50,
 *   // ... other fields
 * };
 * evaluateFeatureFlag(percentageFlag, { userId: 'user123' });
 * // => { enabled: true, reason: "user in 50% rollout" }
 * // OR { enabled: false, reason: "user not in 50% rollout" }
 *
 * // Country targeting
 * const countryFlag: FeatureFlag = {
 *   flagName: 'eu-features',
 *   enabled: true,
 *   rolloutType: 'targeted',
 *   targetCountries: ['DE', 'FR', 'IT'],
 *   // ... other fields
 * };
 * evaluateFeatureFlag(countryFlag, { userId: 'user456', country: 'DE' });
 * // => { enabled: false, reason: "user not in target list" }
 * // (User in allowed country but not in force-in list)
 *
 * // Force-in list (beta testers)
 * const betaFlag: FeatureFlag = {
 *   flagName: 'beta-feature',
 *   enabled: true,
 *   rolloutType: 'targeted',
 *   targetUserIds: ['user789', 'user012'],
 *   // ... other fields
 * };
 * evaluateFeatureFlag(betaFlag, { userId: 'user789' });
 * // => { enabled: true, reason: "user in force-in list" }
 * ```
 */
export function evaluateFeatureFlag(
  flag: FeatureFlag,
  context: EvaluationContext
): EvaluationResult {
  // 1. Master kill switch
  if (!flag.enabled) {
    return { enabled: false };
  }

  // 2. Simple toggle - no phased rollout logic
  if (!flag.rolloutType || flag.rolloutType === 'simple') {
    return { enabled: true };
  }

  // === Phased rollout logic (always includes reason for debugging) ===

  // 3. Require userId for phased rollout
  if (!context.userId) {
    return {
      enabled: false,
      reason: 'userId required for evaluation',
    };
  }

  // 4. Country filter
  if (flag.targetCountries && flag.targetCountries.length > 0) {
    if (!context.country) {
      return {
        enabled: false,
        reason: 'country required for evaluation',
      };
    }
    if (!flag.targetCountries.includes(context.country)) {
      return {
        enabled: false,
        reason: `country ${context.country} not in target list`,
      };
    }
  }

  // 5. Language filter
  if (flag.targetLanguages && flag.targetLanguages.length > 0) {
    if (!context.language) {
      return {
        enabled: false,
        reason: 'language required for evaluation',
      };
    }
    if (!flag.targetLanguages.includes(context.language)) {
      return {
        enabled: false,
        reason: `language ${context.language} not in target list`,
      };
    }
  }

  // 6. Force-in list (highest priority)
  if (flag.targetUserIds && flag.targetUserIds.includes(context.userId)) {
    return {
      enabled: true,
      reason: 'user in force-in list',
    };
  }

  // 7. Force-out list
  if (flag.excludeUserIds && flag.excludeUserIds.includes(context.userId)) {
    return {
      enabled: false,
      reason: 'user in force-out list',
    };
  }

  // 8. Percentage rollout
  if (flag.rolloutType === 'percentage' && flag.rolloutPercentage !== undefined) {
    const hash = hashUserId(flag.platform, flag.environment, flag.flagName, context.userId);

    if (hash < flag.rolloutPercentage) {
      return {
        enabled: true,
        reason: `user in ${flag.rolloutPercentage}% rollout`,
      };
    } else {
      return {
        enabled: false,
        reason: `user not in ${flag.rolloutPercentage}% rollout`,
      };
    }
  }

  // 9. Targeted rollout - user not in target list
  return {
    enabled: false,
    reason: 'user not in target list',
  };
}

/**
 * Evaluates multiple feature flags for a user.
 *
 * @param flags - Array of feature flag configurations
 * @param context - User context (userId, country, language)
 * @returns Object mapping flag names to evaluation results
 *
 * @remarks
 * Efficiently evaluates all flags in a single pass.
 * Used by bulk evaluation endpoint for app initialization.
 *
 * Each flag is evaluated independently using the same context.
 *
 * **Use Cases:**
 * - App initialization: Load all flags at startup
 * - Configuration sync: Refresh all flag states
 * - Debugging: Test user's access to all features at once
 *
 * @example
 * ```ts
 * const flags: FeatureFlag[] = [
 *   {
 *     flagName: 'dark-mode',
 *     enabled: true,
 *     rolloutType: 'simple',
 *     // ... other fields
 *   },
 *   {
 *     flagName: 'new-ui',
 *     enabled: true,
 *     rolloutType: 'percentage',
 *     rolloutPercentage: 50,
 *     // ... other fields
 *   },
 *   {
 *     flagName: 'beta-feature',
 *     enabled: true,
 *     rolloutType: 'targeted',
 *     targetUserIds: ['user123'],
 *     // ... other fields
 *   },
 * ];
 *
 * const context = {
 *   userId: 'user123',
 *   country: 'US',
 *   language: 'en',
 * };
 *
 * const results = evaluateMultipleFeatureFlags(flags, context);
 * // => {
 * //   'dark-mode': { enabled: true },
 * //   'new-ui': { enabled: true, reason: "user in 50% rollout" },
 * //   'beta-feature': { enabled: true, reason: "user in force-in list" }
 * // }
 *
 * // Use in React/Next.js app
 * function useFeatureFlags() {
 *   const [flags, setFlags] = useState({});
 *
 *   useEffect(() => {
 *     fetch('/api/feature-flags/evaluate', {
 *       method: 'POST',
 *       body: JSON.stringify({ userId: user.id })
 *     })
 *       .then(res => res.json())
 *       .then(data => setFlags(data));
 *   }, []);
 *
 *   return flags;
 * }
 *
 * // Check if feature is enabled
 * const flags = useFeatureFlags();
 * if (flags['dark-mode']?.enabled) {
 *   // Show dark mode UI
 * }
 * ```
 */
export function evaluateMultipleFeatureFlags(
  flags: FeatureFlag[],
  context: EvaluationContext
): Record<string, EvaluationResult> {
  const results: Record<string, EvaluationResult> = {};

  for (const flag of flags) {
    results[flag.flagName] = evaluateFeatureFlag(flag, context);
  }

  return results;
}
