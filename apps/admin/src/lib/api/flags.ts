import { browserApiClient } from './browser-client';
import type { Flag, FlagTargeting } from './types';

/**
 * Transform flat targeting fields into proper targeting structure.
 * Converts simple country/language arrays into the backend's nested format.
 */
function buildTargeting(
  targetCountries?: string[],
  targetLanguages?: string[]
): FlagTargeting | undefined {
  // If no targeting specified, return undefined to use defaults
  if (!targetCountries?.length && !targetLanguages?.length) {
    return undefined;
  }

  const targeting: FlagTargeting = {
    countries: [],
    forceIncludeUsers: [],
    forceExcludeUsers: [],
  };

  // Convert flat country list to country targets
  // Countries get serveValue 'A' (primary value when matched)
  if (targetCountries?.length) {
    targeting.countries = targetCountries.map((country) => ({
      country,
      serveValue: 'A' as const,
      // Add languages if targeting specific languages within countries
      languages: targetLanguages?.length
        ? targetLanguages.map((language) => ({
            language,
            serveValue: 'A' as const,
          }))
        : undefined,
    }));
  }

  return targeting;
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
 */
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
    targetCountries?: string[];
    targetLanguages?: string[];
  }
): Promise<Flag> {
  // Transform flat targeting fields to proper structure
  const targeting = buildTargeting(data.targetCountries, data.targetLanguages);

  // Build the payload matching backend schema
  // Note: createdBy is extracted from JWT token by the backend
  const payload: Record<string, unknown> = {
    flagKey: data.flagKey,
    name: data.name,
    description: data.description,
    enabled: data.enabled,
    flagType: data.flagType,
    valueA: data.valueA,
    valueB: data.valueB,
  };

  // Only include targeting if we have targeting rules
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
    targetCountries?: string[];
    targetLanguages?: string[];
  }
): Promise<Flag> {
  // Transform flat targeting fields to proper structure
  const targeting = buildTargeting(data.targetCountries, data.targetLanguages);

  // Build the payload matching backend schema
  // Note: createdBy is extracted from JWT token by the backend
  const payload: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    enabled: data.enabled,
    valueA: data.valueA,
    valueB: data.valueB,
  };

  // Only include targeting if we have targeting rules
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
