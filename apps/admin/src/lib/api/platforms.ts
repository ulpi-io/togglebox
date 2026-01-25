import { browserApiClient } from './browser-client';
import type { Platform, Environment, ConfigVersion } from './types';

// Platforms
export async function getPlatformsApi(): Promise<Platform[]> {
  return browserApiClient('/api/v1/platforms');
}

export async function createPlatformApi(name: string, description?: string): Promise<Platform> {
  return browserApiClient('/api/v1/internal/platforms', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function deletePlatformApi(platform: string): Promise<void> {
  return browserApiClient(`/api/v1/internal/platforms/${platform}`, {
    method: 'DELETE',
  });
}

// Environments
export async function getEnvironmentsApi(platform: string): Promise<Environment[]> {
  return browserApiClient(`/api/v1/platforms/${platform}/environments`);
}

export async function createEnvironmentApi(
  platform: string,
  name: string,
  description?: string
): Promise<Environment> {
  return browserApiClient(`/api/v1/internal/platforms/${platform}/environments`, {
    method: 'POST',
    body: JSON.stringify({ environment: name, description }),
  });
}

export async function deleteEnvironmentApi(platform: string, environment: string): Promise<void> {
  return browserApiClient(`/api/v1/internal/platforms/${platform}/environments/${environment}`, {
    method: 'DELETE',
  });
}

// Config Versions
export async function getConfigVersionsApi(
  platform: string,
  environment: string
): Promise<ConfigVersion[]> {
  return browserApiClient(`/api/v1/platforms/${platform}/environments/${environment}/versions`);
}

export async function getLatestStableConfigApi(
  platform: string,
  environment: string
): Promise<ConfigVersion> {
  return browserApiClient(`/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`);
}
