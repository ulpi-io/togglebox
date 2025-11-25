import { apiClient } from './client';

export interface EvaluationResult {
  flagName: string;
  enabled: boolean;
  reason: string;
}

export async function evaluateFeatureFlagApi(
  platform: string,
  environment: string,
  flagName: string,
  context: {
    userId?: string;
    country?: string;
    language?: string;
  }
): Promise<EvaluationResult> {
  const queryParams = new URLSearchParams();
  if (context.userId) queryParams.append('userId', context.userId);
  if (context.country) queryParams.append('country', context.country);
  if (context.language) queryParams.append('language', context.language);

  return apiClient(
    `/api/v1/platforms/${platform}/environments/${environment}/feature-flags/${flagName}/evaluate?${queryParams.toString()}`
  );
}
