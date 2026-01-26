'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { getConfigVersionsApi, markConfigStableApi, getAllConfigsApi } from '@/lib/api/configs';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { ConfigVersion, User } from '@/lib/api/types';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  FilterTabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@togglebox/ui';
import { ConfigVersionHistory } from '@/components/configs/config-version-history';
import { DeleteConfigButton } from '@/components/configs/delete-config-button';
import { CreateEntityButton } from '@/components/common/create-entity-button';
import { PlatformEnvFilter, usePlatformEnvFilter } from '@/components/filters/platform-env-filter';

type ConfigFilter = 'all' | 'stable' | 'draft';

function ConfigsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingStable, setMarkingStable] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConfigFilter>('all');

  const isAdmin = user?.role === 'admin';

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserApi();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  }, []);

  const loadVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!platform || !environment) {
        // Load all configs across all platforms/environments
        const data = await getAllConfigsApi();
        setVersions(data);
      } else {
        const data = await getConfigVersionsApi(platform, environment);
        setVersions(data);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config versions');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment]);

  useEffect(() => {
    loadVersions();
    loadUser();
  }, [loadVersions, loadUser]);

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

  // Filter logic for the All Versions table
  const stableCount = useMemo(() => versions.filter((v) => v.isStable).length, [versions]);
  const draftCount = useMemo(() => versions.filter((v) => !v.isStable).length, [versions]);

  const filteredVersions = useMemo(() => {
    if (filter === 'stable') return sortedVersions.filter((v) => v.isStable);
    if (filter === 'draft') return sortedVersions.filter((v) => !v.isStable);
    return sortedVersions;
  }, [sortedVersions, filter]);

  const filterOptions = [
    { value: 'all' as const, label: 'All', count: versions.length },
    { value: 'stable' as const, label: 'Stable', count: stableCount },
    { value: 'draft' as const, label: 'Draft', count: draftCount },
  ];

  // Get the display version: stable version if exists, otherwise latest
  const stableVersion = sortedVersions.find((v) => v.isStable);
  const latestVersion = sortedVersions[0];
  const displayVersion = stableVersion || latestVersion;
  const isShowingUnstable = !stableVersion && latestVersion;
  const totalVersions = sortedVersions.length;

  const hasSelection = platform && environment;

  // All configs view (when no filter is selected)
  if (!hasSelection) {
    return (
      <div className="space-y-6">
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-destructive text-lg font-bold mb-2">
                Error loading configs
              </div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={loadVersions}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && versions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h3 className="text-xl font-black mb-2">No Remote Configs Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first remote config version
              </p>
              <CreateEntityButton entityType="configs" />
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && versions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black">All Configs</CardTitle>
                <div className="flex items-center gap-4">
                  <FilterTabs
                    options={filterOptions}
                    value={filter}
                    onChange={setFilter}
                  />
                  <CreateEntityButton entityType="configs" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVersions.map((version) => (
                    <TableRow key={`${version.platform}-${version.environment}-${version.versionTimestamp}`}>
                      <TableCell className="font-semibold">{version.platform}</TableCell>
                      <TableCell>{version.environment}</TableCell>
                      <TableCell className="font-mono">v{version.versionLabel}</TableCell>
                      <TableCell>
                        {version.isStable ? (
                          <Badge variant="default" size="sm" className="font-black">
                            STABLE
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            Draft
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {version.createdBy || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <ConfigVersionHistory
                            platform={version.platform}
                            environment={version.environment}
                            currentVersion={version.versionLabel}
                            onVersionMarkedStable={loadVersions}
                          />
                          <Link
                            href={`/platforms/${version.platform}/environments/${version.environment}/configs/${version.versionLabel}`}
                          >
                            <Button variant="outline" size="sm" className="text-xs">
                              View
                            </Button>
                          </Link>
                          <Link
                            href={`/platforms/${version.platform}/environments/${version.environment}/configs/${version.versionLabel}/edit`}
                          >
                            <Button variant="outline" size="sm" className="text-xs">
                              Edit
                            </Button>
                          </Link>
                          {isAdmin && (
                            <DeleteConfigButton
                              platform={version.platform}
                              environment={version.environment}
                              version={version.versionLabel}
                              onSuccess={loadVersions}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading && (
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

      {error && (
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

      {!isLoading && !error && !displayVersion && (
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

      {!isLoading && !error && displayVersion && (
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
      {!isLoading && !error && sortedVersions.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black">All Versions</CardTitle>
              <FilterTabs
                options={filterOptions}
                value={filter}
                onChange={setFilter}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVersions.map((version) => (
                  <TableRow key={version.versionTimestamp}>
                    <TableCell className="font-mono">v{version.versionLabel}</TableCell>
                    <TableCell>
                      {version.isStable ? (
                        <Badge variant="default" size="sm" className="font-black">
                          STABLE
                        </Badge>
                      ) : (
                        <Badge variant="secondary" size="sm">
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {version.createdBy || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
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
                        {isAdmin && (
                          <DeleteConfigButton
                            platform={platform}
                            environment={environment}
                            version={version.versionLabel}
                            onSuccess={loadVersions}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
