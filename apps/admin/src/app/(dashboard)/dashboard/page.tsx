'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStatsApi, type DashboardStats } from '@/lib/api/stats';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@togglebox/ui';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStatsApi();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your ToggleBox configuration and flags
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your ToggleBox configuration and flags
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading dashboard
            </div>
            <p className="text-muted-foreground">{error || 'Unknown error'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      description: 'Total remote config versions',
    },
    {
      title: 'Flags',
      value: stats.totalFlags,
      description: 'Active flags',
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
            <Button asChild variant="outline" className="w-full justify-start h-auto p-3">
              <Link href="/platforms">
                <div className="text-left">
                  <div className="font-bold">Manage Platforms</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Create and configure platforms
                  </div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-auto p-3">
              <Link href="/platforms">
                <div className="text-left">
                  <div className="font-bold">Deploy Remote Config</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Deploy new config versions
                  </div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-auto p-3">
              <Link href="/users">
                <div className="text-left">
                  <div className="font-bold">Manage Users</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Add or remove team members
                  </div>
                </div>
              </Link>
            </Button>
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
