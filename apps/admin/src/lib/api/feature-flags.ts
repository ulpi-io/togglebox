import { apiClient } from './client';
import type { FeatureFlag } from './types';

export async function getFeatureFlagsApi(
  platform: string,
  environment: string
): Promise<FeatureFlag[]> {
  return apiClient(`/api/v1/platforms/${platform}/environments/${environment}/feature-flags`);
}

export async function createFeatureFlagApi(
  platform: string,
  environment: string,
  data: {
    flagName: string;
    description?: string;
    enabled: boolean;
    rolloutType: 'simple' | 'percentage' | 'targeted';
    rolloutPercentage?: number;
    targetUserIds?: string[];
    excludeUserIds?: string[];
    targetCountries?: string[];
    targetLanguages?: string[];
  }
): Promise<FeatureFlag> {
  return apiClient(`/api/v1/internal/platforms/${platform}/environments/${environment}/feature-flags`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function toggleFeatureFlagApi(
  platform: string,
  environment: string,
  flagName: string
): Promise<void> {
  return apiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/feature-flags/${flagName}/toggle`,
    {
      method: 'PATCH',
    }
  );
}

export async function updateFeatureFlagApi(
  platform: string,
  environment: string,
  flagName: string,
  data: Partial<{
    description: string;
    rolloutType: 'simple' | 'percentage' | 'targeted';
    rolloutPercentage: number;
    targetUserIds: string[];
    excludeUserIds: string[];
    targetCountries: string[];
    targetLanguages: string[];
  }>
): Promise<FeatureFlag> {
  return apiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/feature-flags/${flagName}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteFeatureFlagApi(
  platform: string,
  environment: string,
  flagName: string
): Promise<void> {
  return apiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/feature-flags/${flagName}`,
    {
      method: 'DELETE',
    }
  );
}
