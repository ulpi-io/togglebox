import { apiClient } from './client';

export interface DashboardStats {
  totalPlatforms: number;
  totalEnvironments: number;
  totalConfigVersions: number;
  totalFeatureFlags: number;
  totalUsers: number;
  totalApiKeys: number;
}

export async function getDashboardStatsApi(): Promise<DashboardStats> {
  // This endpoint doesn't exist in the API yet, so we'll aggregate from multiple endpoints
  // In a real implementation, this should be a dedicated stats endpoint

  try {
    const [platforms] = await Promise.all([
      apiClient<any[]>('/api/v1/internal/platforms').catch(() => []),
    ]);

    // For now, return basic stats based on platforms
    // TODO: Add proper stats aggregation when backend supports it
    return {
      totalPlatforms: platforms?.length || 0,
      totalEnvironments: 0, // Would need to fetch from each platform
      totalConfigVersions: 0,
      totalFeatureFlags: 0,
      totalUsers: 0,
      totalApiKeys: 0,
    };
  } catch (error) {
    // Return zeros if API calls fail
    return {
      totalPlatforms: 0,
      totalEnvironments: 0,
      totalConfigVersions: 0,
      totalFeatureFlags: 0,
      totalUsers: 0,
      totalApiKeys: 0,
    };
  }
}
