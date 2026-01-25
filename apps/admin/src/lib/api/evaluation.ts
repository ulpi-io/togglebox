import { browserApiClient } from './browser-client';
import type { FlagEvaluationResult } from './types';

/**
 * Evaluate a flag for a specific user context.
 * Three-Tier Architecture - Tier 2: Feature Flags
 */
export async function evaluateFlagApi(
  platform: string,
  environment: string,
  flagKey: string,
  context: {
    userId?: string;
    country?: string;
    language?: string;
  }
): Promise<FlagEvaluationResult> {
  const queryParams = new URLSearchParams();
  if (context.userId) queryParams.append('userId', context.userId);
  if (context.country) queryParams.append('country', context.country);
  if (context.language) queryParams.append('language', context.language);

  return browserApiClient<FlagEvaluationResult>(
    `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}/evaluate?${queryParams.toString()}`
  );
}
