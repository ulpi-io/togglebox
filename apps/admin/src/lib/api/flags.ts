import { browserApiClient } from './browser-client';
import type { Flag, FlagTargeting } from './types';

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
