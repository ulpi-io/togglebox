import { apiClient } from './client';
import type { ConfigVersion } from './types';

export async function getConfigVersionsApi(
  platform: string,
  environment: string
): Promise<ConfigVersion[]> {
  return apiClient(`/api/v1/internal/platforms/${platform}/environments/${environment}/versions`);
}

export async function createConfigVersionApi(
  platform: string,
  environment: string,
  version: string,
  config: Record<string, unknown>,
  isStable?: boolean
): Promise<ConfigVersion> {
  return apiClient(`/api/v1/internal/platforms/${platform}/environments/${environment}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      version,
      config,
      isStable,
    }),
  });
}

export async function markConfigStableApi(
  platform: string,
  environment: string,
  version: string
): Promise<void> {
  return apiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/versions/${version}/mark-stable`,
    {
      method: 'PATCH',
    }
  );
}

export async function deleteConfigVersionApi(
  platform: string,
  environment: string,
  version: string
): Promise<void> {
  return apiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/versions/${version}`,
    {
      method: 'DELETE',
    }
  );
}

export async function getLatestStableConfigApi(
  platform: string,
  environment: string
): Promise<ConfigVersion> {
  return apiClient(`/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`);
}
