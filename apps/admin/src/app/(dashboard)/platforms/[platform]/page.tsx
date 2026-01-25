'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { getEnvironmentsApi } from '@/lib/api/platforms';
import type { Environment } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@togglebox/ui';
import { DeleteEnvironmentButton } from '@/components/environments/delete-environment-button';

interface PlatformPageProps {
  params: Promise<{
    platform: string;
  }>;
}

export default function PlatformPage({ params }: PlatformPageProps) {
  const { platform } = use(params);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnvironments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getEnvironmentsApi(platform);
      setEnvironments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setIsLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">{platform}</h1>
            <p className="text-muted-foreground">
              Manage environments and remote config for this platform
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/create`}>
              <Button>Create Environment</Button>
            </Link>
            <Link href="/platforms">
              <Button variant="outline">Back to Platforms</Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-32 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-48" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded animate-pulse w-24 mb-3" />
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded animate-pulse" />
                  <div className="h-10 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">{platform}</h1>
            <p className="text-muted-foreground">
              Manage environments and remote config for this platform
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/create`}>
              <Button>Create Environment</Button>
            </Link>
            <Link href="/platforms">
              <Button variant="outline">Back to Platforms</Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading environments
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadEnvironments}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">{platform}</h1>
          <p className="text-muted-foreground">
            Manage environments and configurations for this platform
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/platforms/${platform}/environments/create`}>
              <Button>Create Environment</Button>
            </Link>
          <Link href="/platforms">
            <Button variant="outline">Back to Platforms</Button>
          </Link>
        </div>
      </div>

      {environments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-black mb-2">No Environments Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first environment for {platform}
            </p>
            <Link href={`/platforms/${platform}/environments/create`}>
              <Button>Create Environment</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {environments.map((env) => (
            <Card key={env.environment}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black mb-1">
                      {env.environment}
                    </CardTitle>
                    {env.description && (
                      <p className="text-sm text-muted-foreground">
                        {env.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(env.createdAt).toLocaleDateString()}
                </div>

                <div className="space-y-2 pt-3 border-t border-black/10">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/platforms/${platform}/environments/${env.environment}/configs`}>
                      Remote Config
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/platforms/${platform}/environments/${env.environment}/flags`}>
                      Feature Flags
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/platforms/${platform}/environments/${env.environment}/experiments`}>
                      Experiments
                    </Link>
                  </Button>
                  <div className="flex justify-end pt-2">
                    <DeleteEnvironmentButton
                      platform={platform}
                      environment={env.environment}
                      onSuccess={loadEnvironments}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
