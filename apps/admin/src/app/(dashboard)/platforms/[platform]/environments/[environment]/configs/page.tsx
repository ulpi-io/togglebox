'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { getConfigVersionsApi, markConfigStableApi } from '@/lib/api/configs';
import type { ConfigVersion } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@togglebox/ui';
import { ConfigVersionHistory } from '@/components/configs/config-version-history';

interface ConfigsPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

export default function ConfigsPage({ params }: ConfigsPageProps) {
  const { platform, environment } = use(params);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingStable, setMarkingStable] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getConfigVersionsApi(platform, environment);
      setVersions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config versions');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleMarkStable = async (versionLabel: string) => {
    setMarkingStable(versionLabel);
    try {
      await markConfigStableApi(platform, environment, versionLabel);
      await loadVersions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark as stable');
    } finally {
      setMarkingStable(null);
    }
  };

  // Sort by versionTimestamp descending (latest first)
  const sortedVersions = [...versions].sort((a, b) => {
    return new Date(b.versionTimestamp).getTime() - new Date(a.versionTimestamp).getTime();
  });

  // Get the display version: stable version if exists, otherwise latest
  const stableVersion = sortedVersions.find(v => v.isStable);
  const latestVersion = sortedVersions[0];
  const displayVersion = stableVersion || latestVersion;
  const isShowingUnstable = !stableVersion && latestVersion;
  const totalVersions = sortedVersions.length;

  if (isLoading) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Remote Config</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/${environment}/configs/create`}>
              <Button>Create Config</Button>
            </Link>
            <Link href={`/platforms/${platform}`}>
              <Button variant="outline">Back to {platform}</Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-32 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Remote Config</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/${environment}/configs/create`}>
              <Button>Create Config</Button>
            </Link>
            <Link href={`/platforms/${platform}`}>
              <Button variant="outline">Back to {platform}</Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading remote config
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadVersions}>
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
          <h1 className="text-4xl font-black mb-2">Remote Config</h1>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/platforms/${platform}/environments/${environment}/configs/create`}>
              <Button>Create Config</Button>
            </Link>
          <Link href={`/platforms/${platform}`}>
            <Button variant="outline">Back to {platform}</Button>
          </Link>
        </div>
      </div>

      {!displayVersion ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-xl font-black mb-2">No Remote Config Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first remote config version for {environment}
            </p>
            <Link href={`/platforms/${platform}/environments/${environment}/configs/create`}>
              <Button>Create Config</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-2xl font-black">
                    v{displayVersion.versionLabel}
                  </CardTitle>
                  {displayVersion.isStable ? (
                    <Badge variant="default" size="sm">STABLE</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">LATEST (NOT STABLE)</Badge>
                  )}
                  {totalVersions > 1 && (
                    <Badge variant="secondary" size="sm">
                      {totalVersions} version{totalVersions !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Deployed {new Date(displayVersion.createdAt).toLocaleString()}
                </p>
                {isShowingUnstable && (
                  <p className="text-sm text-yellow-600 mt-1">
                    No stable version set. Consider marking this version as stable for production use.
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-bold mb-2">Configuration:</div>
              <pre className="p-4 bg-muted border border-black/10 rounded-lg overflow-x-auto text-xs font-mono max-h-64 overflow-y-auto">
                {JSON.stringify(displayVersion.config, null, 2)}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-black/10">
              <ConfigVersionHistory
                platform={platform}
                environment={environment}
                currentVersion={displayVersion.versionLabel}
                onVersionMarkedStable={loadVersions}
              />
              <Link
                href={`/platforms/${platform}/environments/${environment}/configs/${displayVersion.versionLabel}`}
              >
                <Button variant="outline" size="sm" className="text-xs">
                  View Details
                </Button>
              </Link>
              <Link href={`/platforms/${platform}/environments/${environment}/configs/${displayVersion.versionLabel}/edit`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Edit
                </Button>
              </Link>
              {!displayVersion.isStable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkStable(displayVersion.versionLabel)}
                  disabled={markingStable === displayVersion.versionLabel}
                  className="text-xs"
                >
                  {markingStable === displayVersion.versionLabel ? 'Marking...' : 'Mark Stable'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
