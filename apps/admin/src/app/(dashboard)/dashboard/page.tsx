import { getDashboardStatsApi } from '@/lib/api/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStatsApi();

  const statCards = [
    {
      title: 'Platforms',
      value: stats.totalPlatforms,
      description: 'Total platforms configured',
    },
    {
      title: 'Environments',
      value: stats.totalEnvironments,
      description: 'Environments across all platforms',
    },
    {
      title: 'Config Versions',
      value: stats.totalConfigVersions,
      description: 'Total configuration versions',
    },
    {
      title: 'Feature Flags',
      value: stats.totalFeatureFlags,
      description: 'Active feature flags',
    },
    {
      title: 'Users',
      value: stats.totalUsers,
      description: 'Total users with access',
    },
    {
      title: 'API Keys',
      value: stats.totalApiKeys,
      description: 'Active API keys',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your ToggleBox configuration and feature flags
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/platforms"
              className="block p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"
            >
              <div className="font-bold">Manage Platforms</div>
              <div className="text-sm text-muted-foreground">
                Create and configure platforms
              </div>
            </a>
            <a
              href="/platforms"
              className="block p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"
            >
              <div className="font-bold">Deploy Configuration</div>
              <div className="text-sm text-muted-foreground">
                Deploy new config versions
              </div>
            </a>
            <a
              href="/users"
              className="block p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"
            >
              <div className="font-bold">Manage Users</div>
              <div className="text-sm text-muted-foreground">
                Add or remove team members
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              Activity tracking coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
