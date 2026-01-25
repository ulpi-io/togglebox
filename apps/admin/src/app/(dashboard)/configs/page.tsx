'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { getConfigVersionsApi, markConfigStableApi } from '@/lib/api/configs';
import type { ConfigVersion } from '@/lib/api/types';
import { Badge, Card, CardContent, CardHeader, CardTitle, Button } from '@togglebox/ui';
import { ConfigVersionHistory } from '@/components/configs/config-version-history';
import { PlatformEnvFilter, usePlatformEnvFilter } from '@/components/filters/platform-env-filter';

function ConfigsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingStable, setMarkingStable] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!platform || !environment) {
      setVersions([]);
      return;
    }

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
    if (!platform || !environment) return;
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
  const stableVersion = sortedVersions.find((v) => v.isStable);
  const latestVersion = sortedVersions[0];
  const displayVersion = stableVersion || latestVersion;
  const isShowingUnstable = !stableVersion && latestVersion;
  const totalVersions = sortedVersions.length;

  const hasSelection = platform && environment;

  return (
    <div className="space-y-6">
      {hasSelection && isLoading && (
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-32 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      )}

      {hasSelection && error && (
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
      )}

      {hasSelection && !isLoading && !error && !displayVersion && (
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
      )}

      {hasSelection && !isLoading && !error && displayVersion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-2xl font-black">
                    v{displayVersion.versionLabel}
                  </CardTitle>
                  {displayVersion.isStable ? (
                    <Badge variant="default" size="sm" className="font-black">
                      STABLE
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="font-black">
                      LATEST (NOT STABLE)
                    </Badge>
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
                  <p className="text-sm text-warning mt-1">
                    No stable version set. Consider marking this version as stable for production use.
                  </p>
                )}
              </div>
              <Link href={`/platforms/${platform}/environments/${environment}/configs/create`}>
                <Button>Create Config</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-bold mb-2">Configuration:</div>
              <pre className="p-4 bg-muted border border-black/20 rounded-lg overflow-x-auto text-xs font-mono max-h-64 overflow-y-auto">
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
                <Button variant="outline" size="sm" className="text-xs">Edit</Button>
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

      {/* All Versions Table */}
      {hasSelection && !isLoading && !error && sortedVersions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">All Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-2 px-3 font-black">Version</th>
                    <th className="text-left py-2 px-3 font-black">Status</th>
                    <th className="text-left py-2 px-3 font-black">Created By</th>
                    <th className="text-left py-2 px-3 font-black">Created</th>
                    <th className="text-right py-2 px-3 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVersions.map((version) => (
                    <tr key={version.versionTimestamp} className="border-b border-border">
                      <td className="py-2 px-3 font-mono">v{version.versionLabel}</td>
                      <td className="py-2 px-3">
                        {version.isStable ? (
                          <Badge variant="default" size="sm" className="font-black">
                            STABLE
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            Draft
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{version.createdBy}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/platforms/${platform}/environments/${environment}/configs/${version.versionLabel}`}
                          >
                            <Button variant="outline" size="sm" className="text-xs">
                              View
                            </Button>
                          </Link>
                          {!version.isStable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkStable(version.versionLabel)}
                              disabled={markingStable === version.versionLabel}
                              className="text-xs"
                            >
                              {markingStable === version.versionLabel ? '...' : 'Mark Stable'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ConfigsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Remote Configs</h1>
        <p className="text-muted-foreground">
          Manage remote configuration versions
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div>Loading...</div>}>
          <PlatformEnvFilter />
        </Suspense>
      </div>

      <Suspense fallback={<div>Loading configs...</div>}>
        <ConfigsContent />
      </Suspense>
    </div>
  );
}
