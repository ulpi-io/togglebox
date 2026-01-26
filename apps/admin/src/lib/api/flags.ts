import { browserApiClient } from './browser-client';
import type { Flag, FlagTargeting, Platform, Environment } from './types';

/**
 * Get all flags across all platforms and environments.
 * Used when no filter is applied.
 */
export async function getAllFlagsApi(): Promise<Flag[]> {
  // First, get all platforms
  const platforms = await browserApiClient<Platform[]>('/api/v1/platforms');

  // For each platform, get environments and then flags
  const allFlags: Flag[] = [];

  await Promise.all(
    platforms.map(async (platform) => {
      try {
        const environments = await browserApiClient<Environment[]>(
          `/api/v1/platforms/${platform.name}/environments`
        );

        await Promise.all(
          environments.map(async (env) => {
            try {
              const flags = await browserApiClient<Flag[]>(
                `/api/v1/platforms/${platform.name}/environments/${env.environment}/flags`
              );
              allFlags.push(...flags);
            } catch {
              // Environment may have no flags, skip it
            }
          })
        );
      } catch {
        // Platform may have no environments, skip it
      }
    })
  );

  return allFlags;
}

/**
 * Get all active flags for an environment.
 * Three-Tier Architecture - Tier 2: Feature Flags
 */
export async function getFlagsApi(
  platform: string,
  environment: string
): Promise<Flag[]> {
  return browserApiClient<Flag[]>(
    `/api/v1/platforms/${platform}/environments/${environment}/flags`
  );
}

/**
 * Get a specific flag (active version).
 */
export async function getFlagApi(
  platform: string,
  environment: string,
  flagKey: string
): Promise<Flag> {
  return browserApiClient<Flag>(
    `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}`
  );
}

/**
 * Get all versions of a flag.
 */
export async function getFlagVersionsApi(
  platform: string,
  environment: string,
  flagKey: string
): Promise<Flag[]> {
  return browserApiClient<Flag[]>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/versions`
  );
}

/**
 * Create a new flag (first version).
 * Tier 2: 2-value model with country/language targeting.
 *
 * Note: For percentage-based rollouts, use Experiments (Tier 3) instead.
 */
export async function createFlagApi(
  platform: string,
  environment: string,
  data: {
    flagKey: string;
    name: string;
    description?: string;
    enabled?: boolean;
    flagType?: 'boolean' | 'string' | 'number';
    valueA?: boolean | string | number;
    valueB?: boolean | string | number;
    targeting?: {
      countries?: { country: string; languages?: { language: string }[] }[];
      forceIncludeUsers?: string[];
      forceExcludeUsers?: string[];
    };
  }
): Promise<Flag> {
  // Convert targeting to FlagTargeting format
  let targeting: FlagTargeting | undefined;

  if (data.targeting) {
    targeting = {
      countries: data.targeting.countries?.map(c => ({
        country: c.country,
        serveValue: 'A' as const,
        languages: c.languages?.map(l => ({
          language: l.language,
          serveValue: 'A' as const,
        })),
      })) || [],
      forceIncludeUsers: data.targeting.forceIncludeUsers || [],
      forceExcludeUsers: data.targeting.forceExcludeUsers || [],
    };
    // Clean up empty targeting
    if (targeting.countries?.length === 0 &&
        targeting.forceIncludeUsers?.length === 0 &&
        targeting.forceExcludeUsers?.length === 0) {
      targeting = undefined;
    }
  }

  const payload: Record<string, unknown> = {
    flagKey: data.flagKey,
    name: data.name,
    description: data.description,
    enabled: data.enabled,
    flagType: data.flagType,
    valueA: data.valueA,
    valueB: data.valueB,
  };

  if (targeting) {
    payload.targeting = targeting;
  }

  return browserApiClient<Flag>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Update a flag (creates new version).
 *
 * Note: For percentage-based rollouts, use Experiments (Tier 3) instead.
 */
export async function updateFlagApi(
  platform: string,
  environment: string,
  flagKey: string,
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    valueA?: boolean | string | number;
    valueB?: boolean | string | number;
    targeting?: {
      countries?: { country: string; languages?: { language: string }[] }[];
      forceIncludeUsers?: string[];
      forceExcludeUsers?: string[];
    };
  }
): Promise<Flag> {
  // Convert targeting to FlagTargeting format
  let targeting: FlagTargeting | undefined;

  if (data.targeting) {
    targeting = {
      countries: data.targeting.countries?.map(c => ({
        country: c.country,
        serveValue: 'A' as const,
        languages: c.languages?.map(l => ({
          language: l.language,
          serveValue: 'A' as const,
        })),
      })) || [],
      forceIncludeUsers: data.targeting.forceIncludeUsers || [],
      forceExcludeUsers: data.targeting.forceExcludeUsers || [],
    };
    // Clean up empty targeting
    if (targeting.countries?.length === 0 &&
        targeting.forceIncludeUsers?.length === 0 &&
        targeting.forceExcludeUsers?.length === 0) {
      targeting = undefined;
    }
  }

  const payload: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    enabled: data.enabled,
    valueA: data.valueA,
    valueB: data.valueB,
  };

  if (targeting) {
    payload.targeting = targeting;
  }

  return browserApiClient<Flag>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Toggle a flag's enabled state.
 */
export async function toggleFlagApi(
  platform: string,
  environment: string,
  flagKey: string,
  enabled: boolean
): Promise<Flag> {
  return browserApiClient<Flag>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/toggle`,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }
  );
}

/**
 * Delete a flag and all its versions (admin only).
 */
export async function deleteFlagApi(
  platform: string,
  environment: string,
  flagKey: string
): Promise<void> {
  await browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Rollout settings for gradual feature rollouts.
 */
export interface RolloutSettings {
  rolloutEnabled?: boolean;
  rolloutPercentageA?: number; // 0-100
  rolloutPercentageB?: number; // 0-100
}

/**
 * Update a flag's rollout settings for gradual rollouts.
 *
 * This is an in-place update (no new version created) that controls
 * what percentage of users see valueA vs valueB.
 *
 * Example: Gradually roll out a feature from 10% -> 50% -> 100%
 * - rolloutEnabled: true
 * - rolloutPercentageA: 10 (10% get the new feature)
 * - rolloutPercentageB: 90 (90% get the old behavior)
 */
export async function updateFlagRolloutApi(
  platform: string,
  environment: string,
  flagKey: string,
  settings: RolloutSettings
): Promise<Flag> {
  return browserApiClient<Flag>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/rollout`,
    {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }
  );
}
