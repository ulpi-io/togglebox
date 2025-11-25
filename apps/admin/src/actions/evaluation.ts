/**
 * Server actions for feature flag evaluation testing.
 *
 * @module actions/evaluation
 *
 * @remarks
 * These Next.js server actions handle feature flag evaluation for testing purposes.
 * Allows admin users to test flag evaluation logic before deploying to production.
 */
'use server';

import { evaluateFeatureFlagApi } from '@/lib/api/evaluation';

/**
 * Evaluates a feature flag with provided user context.
 *
 * @param platform - Platform identifier
 * @param environment - Environment name
 * @param flagName - Feature flag name to evaluate
 * @param context - User context for evaluation (userId, country, language)
 *
 * @returns Promise resolving to evaluation result showing if flag is enabled for context
 *
 * @remarks
 * **Purpose:**
 * This action is used in the admin dashboard to test feature flag evaluation logic.
 * Helps admins verify that targeting rules and percentage rollouts work correctly
 * before enabling flags in production.
 *
 * **Evaluation Logic:**
 * The backend evaluates the flag based on its rollout type:
 * - **Simple**: Returns the flag's enabled state for all users
 * - **Percentage**: Uses consistent hashing on userId to determine inclusion
 * - **Targeted**: Checks if user matches targeting rules (user IDs, country, language)
 *
 * **Context Parameters:**
 * - `userId`: User identifier for percentage rollouts and user targeting
 * - `country`: ISO 3166-1 alpha-2 country code (e.g., "US", "CA")
 * - `language`: ISO 639-1 language code (e.g., "en", "fr")
 *
 * **Testing Scenarios:**
 * - Test percentage rollout: Provide different userIds to see distribution
 * - Test country targeting: Provide different country codes
 * - Test user targeting: Test with included/excluded user IDs
 * - Test combined rules: Verify all targeting conditions work together
 *
 * @example
 * ```ts
 * // Test simple toggle
 * const result1 = await evaluateFlagAction('web', 'production', 'dark-mode', {});
 * console.log(result1.data.enabled); // true or false
 *
 * // Test percentage rollout
 * const result2 = await evaluateFlagAction('web', 'production', 'new-ui', {
 *   userId: 'user123'
 * });
 * console.log(result2.data.enabled); // true if user123 is in rollout percentage
 *
 * // Test country targeting
 * const result3 = await evaluateFlagAction('web', 'production', 'eu-features', {
 *   userId: 'user456',
 *   country: 'DE',
 *   language: 'de'
 * });
 * console.log(result3.data.enabled); // true if Germany is in target countries
 * ```
 */
export async function evaluateFlagAction(
  platform: string,
  environment: string,
  flagName: string,
  context: {
    userId?: string;
    country?: string;
    language?: string;
  }
): Promise<{ success: boolean; data?: { enabled: boolean; reason?: string }; error?: string }> {
  try {
    const result = await evaluateFeatureFlagApi(platform, environment, flagName, context);

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to evaluate feature flag';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
