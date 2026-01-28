"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDashboardStatsApi, type DashboardStats } from "@/lib/api/stats";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@togglebox/ui";

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
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard stats",
        );
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
        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <div className="h-8 w-8 bg-muted rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-16 mx-auto mb-1" />
                <div className="h-3 bg-muted rounded animate-pulse w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(7)].map((_, i) => (
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
            <p className="text-muted-foreground">{error || "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Platforms",
      value: stats.totalPlatforms,
      description: "Total platforms configured",
    },
    {
      title: "Environments",
      value: stats.totalEnvironments,
      description: "Environments across all platforms",
    },
    {
      title: "Config Parameters",
      value: stats.totalConfigParameters,
      description: "Firebase-style config parameters",
    },
    {
      title: "Flags",
      value: stats.totalFlags,
      description: "Feature flags across all environments",
    },
    {
      title: "Experiments",
      value: stats.totalExperiments,
      description: "A/B experiments across all environments",
    },
    {
      title: "Users",
      value: stats.totalUsers,
      description: "Total users with access",
    },
    {
      title: "API Keys",
      value: stats.totalApiKeys,
      description: "Active API keys",
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

      {/* Quick Actions - Horizontal Row at Top */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/configs" className="block">
          <Card className="h-full hover:border-black/30 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">&#9881;</div>
              <div className="font-bold text-sm">Configs</div>
              <div className="text-xs text-muted-foreground">
                Remote configuration
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/flags" className="block">
          <Card className="h-full hover:border-black/30 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">&#9873;</div>
              <div className="font-bold text-sm">Flags</div>
              <div className="text-xs text-muted-foreground">Feature flags</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/experiments" className="block">
          <Card className="h-full hover:border-black/30 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">&#9874;</div>
              <div className="font-bold text-sm">Experiments</div>
              <div className="text-xs text-muted-foreground">A/B testing</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/users" className="block">
          <Card className="h-full hover:border-black/30 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">&#128101;</div>
              <div className="font-bold text-sm">Users</div>
              <div className="text-xs text-muted-foreground">Team members</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2">{stat.value}</div>
              <p className="text-sm text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
