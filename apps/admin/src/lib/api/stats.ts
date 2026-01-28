import { getPlatformsApi, getEnvironmentsApi } from "./platforms";
import { listConfigParametersApi } from "./configs";
import { getFlagsApi } from "./flags";
import { getExperimentsApi } from "./experiments";
import { getUsersApi } from "./users";
import { getApiKeysApi } from "./api-keys";
import { browserApiClient } from "./browser-client";
import type { FlagStats, FlagCountryStats, FlagDailyStats } from "./types";

export interface DashboardStats {
  totalPlatforms: number;
  totalEnvironments: number;
  totalConfigParameters: number;
  totalFlags: number;
  totalExperiments: number;
  totalUsers: number;
  totalApiKeys: number;
}

/**
 * Get aggregated dashboard statistics.
 *
 * @remarks
 * Aggregates statistics by fetching data from multiple endpoints:
 * - Platforms list
 * - Environments for each platform
 * - Config versions for each environment
 * - Flags for each environment
 *
 * **Performance Note:**
 * This performs client-side aggregation with multiple API calls.
 * For better performance, consider implementing a dedicated
 * `/api/v1/internal/stats` endpoint with server-side aggregation.
 *
 * @returns Dashboard statistics with resource counts
 */
export async function getDashboardStatsApi(): Promise<DashboardStats> {
  try {
    // Fetch all platforms
    const platforms = await getPlatformsApi();

    // Handle case where platforms is null/undefined
    if (!platforms || !Array.isArray(platforms)) {
      return {
        totalPlatforms: 0,
        totalEnvironments: 0,
        totalConfigParameters: 0,
        totalFlags: 0,
        totalExperiments: 0,
        totalUsers: 0,
        totalApiKeys: 0,
      };
    }

    let totalEnvironments = 0;
    let totalConfigParameters = 0;
    let totalFlags = 0;
    let totalExperiments = 0;

    // For each platform, fetch environments and their resources
    await Promise.all(
      platforms.map(async (platform) => {
        try {
          const environments = await getEnvironmentsApi(platform.name);

          if (!environments || !Array.isArray(environments)) {
            return;
          }

          totalEnvironments += environments.length;

          // For each environment, fetch config parameters, flags, and experiments in parallel
          await Promise.all(
            environments.map(async (env) => {
              try {
                const [configParams, flags, experiments] = await Promise.all([
                  listConfigParametersApi(platform.name, env.environment).catch(
                    () => [],
                  ),
                  getFlagsApi(platform.name, env.environment).catch(() => []),
                  getExperimentsApi(platform.name, env.environment).catch(
                    () => [],
                  ),
                ]);

                totalConfigParameters += Array.isArray(configParams)
                  ? configParams.length
                  : 0;
                totalFlags += Array.isArray(flags) ? flags.length : 0;
                totalExperiments += Array.isArray(experiments)
                  ? experiments.length
                  : 0;
              } catch {
                // Silently ignore individual environment errors
              }
            }),
          );
        } catch {
          // Silently ignore platform errors
        }
      }),
    );

    // Fetch users and API keys counts
    let totalUsers = 0;
    let totalApiKeys = 0;

    try {
      const [users, apiKeys] = await Promise.all([
        getUsersApi().catch(() => []),
        getApiKeysApi().catch(() => []),
      ]);
      totalUsers = Array.isArray(users) ? users.length : 0;
      totalApiKeys = Array.isArray(apiKeys) ? apiKeys.length : 0;
    } catch {
      // Silently ignore
    }

    return {
      totalPlatforms: platforms.length,
      totalEnvironments,
      totalConfigParameters,
      totalFlags,
      totalExperiments,
      totalUsers,
      totalApiKeys,
    };
  } catch {
    // Return zeros if API calls fail (graceful degradation)
    return {
      totalPlatforms: 0,
      totalEnvironments: 0,
      totalConfigParameters: 0,
      totalFlags: 0,
      totalExperiments: 0,
      totalUsers: 0,
      totalApiKeys: 0,
    };
  }
}

// Flag-specific stats functions

/**
 * Get flag stats (overall metrics).
 */
export async function getFlagStatsApi(
  platform: string,
  environment: string,
  flagKey: string,
): Promise<FlagStats> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/stats`,
  );
}

/**
 * Get flag stats by country.
 */
export async function getFlagStatsByCountryApi(
  platform: string,
  environment: string,
  flagKey: string,
): Promise<FlagCountryStats[]> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/stats/by-country`,
  );
}

/**
 * Get flag stats daily time series.
 */
export async function getFlagStatsDailyApi(
  platform: string,
  environment: string,
  flagKey: string,
  days: number = 30,
): Promise<FlagDailyStats[]> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/stats/daily?days=${days}`,
  );
}
