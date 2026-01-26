import { browserApiClient } from './browser-client';
import type { ConfigVersion, Platform, Environment } from './types';

/**
 * Get all configs across all platforms and environments.
 * Used when no filter is applied.
 */
export async function getAllConfigsApi(): Promise<(ConfigVersion & { platform: string; environment: string })[]> {
  // First, get all platforms
  const platforms = await browserApiClient<Platform[]>('/api/v1/platforms');

  // For each platform, get environments and then configs
  const allConfigs: (ConfigVersion & { platform: string; environment: string })[] = [];

  await Promise.all(
    platforms.map(async (platform) => {
      try {
        const environments = await browserApiClient<Environment[]>(
          `/api/v1/platforms/${platform.name}/environments`
        );

        await Promise.all(
          environments.map(async (env) => {
            try {
              const versions = await browserApiClient<ConfigVersion[]>(
                `/api/v1/platforms/${platform.name}/environments/${env.environment}/versions`
              );
              // Only get the latest stable or latest version for each environment
              const sortedVersions = [...versions].sort(
                (a, b) => new Date(b.versionTimestamp).getTime() - new Date(a.versionTimestamp).getTime()
              );
              const stableVersion = sortedVersions.find((v) => v.isStable);
              const displayVersion = stableVersion || sortedVersions[0];
              if (displayVersion) {
                allConfigs.push({
                  ...displayVersion,
                  platform: platform.name,
                  environment: env.environment,
                });
              }
            } catch {
              // Environment may have no configs, skip it
            }
          })
        );
      } catch {
        // Platform may have no environments, skip it
      }
    })
  );

  return allConfigs;
}

export async function getConfigVersionsApi(
  platform: string,
  environment: string
): Promise<ConfigVersion[]> {
  return browserApiClient(`/api/v1/platforms/${platform}/environments/${environment}/versions`);
}

export async function createConfigVersionApi(
  platform: string,
  environment: string,
  version: string,
  config: Record<string, unknown>,
  isStable?: boolean
): Promise<ConfigVersion> {
  return browserApiClient(`/api/v1/internal/platforms/${platform}/environments/${environment}/versions`, {
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
  return browserApiClient(
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
  return browserApiClient(
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
  return browserApiClient(`/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`);
}
