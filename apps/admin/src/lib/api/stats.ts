import { getPlatformsApi, getEnvironmentsApi, getConfigVersionsApi } from './platforms';
import { getFlagsApi } from './flags';
import { getUsersApi } from './users';
import { getApiKeysApi } from './api-keys';

export interface DashboardStats {
  totalPlatforms: number;
  totalEnvironments: number;
  totalConfigVersions: number;
  totalFlags: number;
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
    console.log('[Stats] Fetching platforms...');
    const platforms = await getPlatformsApi();
    console.log('[Stats] Platforms fetched:', platforms?.length ?? 0, platforms);

    // Handle case where platforms is null/undefined
    if (!platforms || !Array.isArray(platforms)) {
      console.warn('[Stats] No platforms returned or invalid response');
      return {
        totalPlatforms: 0,
        totalEnvironments: 0,
        totalConfigVersions: 0,
        totalFlags: 0,
        totalUsers: 0,
        totalApiKeys: 0,
      };
    }

    let totalEnvironments = 0;
    let totalConfigVersions = 0;
    let totalFlags = 0;

    // For each platform, fetch environments and their resources
    await Promise.all(
      platforms.map(async (platform) => {
        try {
          console.log(`[Stats] Fetching environments for platform: ${platform.name}`);
          const environments = await getEnvironmentsApi(platform.name);
          console.log(`[Stats] Environments for ${platform.name}:`, environments?.length ?? 0);

          if (!environments || !Array.isArray(environments)) {
            console.warn(`[Stats] No environments for platform ${platform.name}`);
            return;
          }

          totalEnvironments += environments.length;

          // For each environment, fetch configs and flags in parallel
          await Promise.all(
            environments.map(async (env) => {
              try {
                console.log(`[Stats] Fetching configs/flags for ${platform.name}/${env.environment}`);
                const [configs, flags] = await Promise.all([
                  getConfigVersionsApi(platform.name, env.environment).catch((err) => {
                    console.warn(`[Stats] Failed to fetch configs for ${platform.name}/${env.environment}:`, err);
                    return [];
                  }),
                  getFlagsApi(platform.name, env.environment).catch((err) => {
                    console.warn(`[Stats] Failed to fetch flags for ${platform.name}/${env.environment}:`, err);
                    return [];
                  }),
                ]);

                const configCount = Array.isArray(configs) ? configs.length : 0;
                const flagCount = Array.isArray(flags) ? flags.length : 0;

                console.log(`[Stats] ${platform.name}/${env.environment}: ${configCount} configs, ${flagCount} flags`);

                totalConfigVersions += configCount;
                totalFlags += flagCount;
              } catch (err) {
                console.warn(`[Stats] Error fetching data for ${platform.name}/${env.environment}:`, err);
              }
            })
          );
        } catch (err) {
          console.warn(`[Stats] Error fetching environments for ${platform.name}:`, err);
        }
      })
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
    } catch (err) {
      console.warn('[Stats] Failed to fetch users/API keys:', err);
    }

    const stats = {
      totalPlatforms: platforms.length,
      totalEnvironments,
      totalConfigVersions,
      totalFlags,
      totalUsers,
      totalApiKeys,
    };

    console.log('[Stats] Final stats:', stats);
    return stats;
  } catch (err) {
    console.error('[Stats] Failed to load dashboard stats:', err);
    // Return zeros if API calls fail (graceful degradation)
    return {
      totalPlatforms: 0,
      totalEnvironments: 0,
      totalConfigVersions: 0,
      totalFlags: 0,
      totalUsers: 0,
      totalApiKeys: 0,
    };
  }
}
