'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getPlatformsApi, getEnvironmentsApi } from '@/lib/api/platforms';
import type { Platform, Environment } from '@/lib/api/types';
import { Card, CardContent, Button, Badge, Skeleton } from '@togglebox/ui';
import { DeleteEnvironmentButton } from '@/components/environments/delete-environment-button';
import { ChevronRight, Layers, Flag, FlaskConical } from 'lucide-react';

interface EnvironmentWithPlatform extends Environment {
  platformName: string;
}

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<EnvironmentWithPlatform[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const platformsData = await getPlatformsApi();
      setPlatforms(platformsData);

      const allEnvironments: EnvironmentWithPlatform[] = [];
      for (const platform of platformsData) {
        try {
          const envs = await getEnvironmentsApi(platform.name);
          allEnvironments.push(
            ...envs.map((env) => ({
              ...env,
              platformName: platform.name,
            }))
          );
        } catch {
          // Continue loading other platforms
        }
      }

      setEnvironments(allEnvironments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEnvironments = selectedPlatform
    ? environments.filter((e) => e.platformName === selectedPlatform)
    : environments;

  const groupedByPlatform = filteredEnvironments.reduce(
    (acc, env) => {
      if (!acc[env.platformName]) {
        acc[env.platformName] = [];
      }
      acc[env.platformName].push(env);
      return acc;
    },
    {} as Record<string, EnvironmentWithPlatform[]>
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Environments</h1>
          <p className="text-muted-foreground mt-1">
            All environments across all platforms ({environments.length} total)
          </p>
        </div>
      </div>

      {/* Platform filter */}
      {platforms.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedPlatform === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPlatform(null)}
          >
            All Platforms
          </Button>
          {platforms.map((p) => (
            <Button
              key={p.name}
              variant={selectedPlatform === p.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform(p.name)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card>
          <div className="divide-y">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-semibold mb-2">
              Error loading environments
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredEnvironments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold mb-2">No Environments Yet</h3>
            <p className="text-muted-foreground mb-6">
              {selectedPlatform
                ? `No environments found for ${selectedPlatform}. Create one to get started.`
                : 'Create platforms first, then add environments to them.'}
            </p>
            <Button asChild>
              <Link href="/platforms">Go to Platforms</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByPlatform).map(([platformName, envs]) => (
            <div key={platformName}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{platformName}</h2>
                <Link href={`/platforms/${platformName}/environments/create`}>
                  <Button size="sm">Create Environment</Button>
                </Link>
              </div>
              <Card>
                <div className="divide-y">
                  {envs.map((env) => (
                    <div
                      key={`${env.platformName}-${env.environment}`}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold truncate">{env.environment}</h3>
                          <span className="text-xs text-muted-foreground">
                            {new Date(env.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {env.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {env.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button asChild variant="ghost" size="icon-sm" title="Configs">
                          <Link href={`/configs?platform=${env.platformName}&environment=${env.environment}`}>
                            <Layers className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon-sm" title="Flags">
                          <Link href={`/flags?platform=${env.platformName}&environment=${env.environment}`}>
                            <Flag className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon-sm" title="Experiments">
                          <Link href={`/experiments?platform=${env.platformName}&environment=${env.environment}`}>
                            <FlaskConical className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteEnvironmentButton
                          platform={env.platformName}
                          environment={env.environment}
                          onSuccess={loadData}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
