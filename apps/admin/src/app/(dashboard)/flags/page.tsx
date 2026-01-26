'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { getFlagsApi, getAllFlagsApi } from '@/lib/api/flags';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Flag, User } from '@/lib/api/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FilterTabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@togglebox/ui';
import { ToggleFlagButton } from '@/components/flags/toggle-flag-button';
import { DeleteFlagButton } from '@/components/flags/delete-flag-button';
import { VersionHistory } from '@/components/flags/version-history';
import { CreateEntityButton } from '@/components/common/create-entity-button';
import { PlatformEnvFilter, usePlatformEnvFilter } from '@/components/filters/platform-env-filter';
import { BarChart3, ChevronRight, TrendingUp } from 'lucide-react';

type FlagFilter = 'all' | 'enabled' | 'disabled';

function FlagsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FlagFilter>('all');

  const isAdmin = user?.role === 'admin';

  const enabledCount = useMemo(() => flags.filter((f) => f.enabled).length, [flags]);
  const disabledCount = useMemo(() => flags.filter((f) => !f.enabled).length, [flags]);

  const filteredFlags = useMemo(() => {
    if (filter === 'enabled') return flags.filter((f) => f.enabled);
    if (filter === 'disabled') return flags.filter((f) => !f.enabled);
    return flags;
  }, [flags, filter]);

  const filterOptions = [
    { value: 'all' as const, label: 'All', count: flags.length },
    { value: 'enabled' as const, label: 'Enabled', count: enabledCount },
    { value: 'disabled' as const, label: 'Disabled', count: disabledCount },
  ];

  const loadFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!platform || !environment) {
        // Load all flags across all platforms/environments
        const data = await getAllFlagsApi();
        setFlags(data);
      } else {
        const data = await getFlagsApi(platform, environment);
        setFlags(data);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment]);

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserApi();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  }, []);

  useEffect(() => {
    loadFlags();
    loadUser();
  }, [loadFlags, loadUser]);

  const hasSelection = platform && environment;

  // All flags view (when no filter is selected)
  if (!hasSelection) {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading flags
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadFlags}>
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (flags.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🚩</div>
            <h3 className="text-xl font-black mb-2">No Feature Flags Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first feature flag
            </p>
            <CreateEntityButton entityType="flags" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black">All Flags</CardTitle>
            <div className="flex items-center gap-4">
              <FilterTabs
                options={filterOptions}
                value={filter}
                onChange={setFilter}
              />
              <CreateEntityButton entityType="flags" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.map((flag) => (
                <TableRow key={`${flag.platform}-${flag.environment}-${flag.flagKey}`}>
                  <TableCell className="font-semibold">{flag.platform}</TableCell>
                  <TableCell>{flag.environment}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{flag.flagKey}</span>
                      {(flag.isActive === undefined || flag.isActive) && (
                        <Badge status="active" size="sm">Active</Badge>
                      )}
                    </div>
                    {flag.name && flag.name !== flag.flagKey && (
                      <p className="text-xs text-muted-foreground mt-0.5">{flag.name}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm" className="font-mono text-xs uppercase">
                      {flag.flagType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={flag.enabled ? 'default' : 'secondary'} size="sm">
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {flag.createdBy || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/platforms/${flag.platform}/environments/${flag.environment}/flags/${flag.flagKey}/stats`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View statistics"
                      >
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <Link href={`/platforms/${flag.platform}/environments/${flag.environment}/flags/${flag.flagKey}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs">Edit</Button>
                      </Link>
                      {isAdmin && (
                        <DeleteFlagButton
                          platform={flag.platform}
                          environment={flag.environment}
                          flagKey={flag.flagKey}
                          onSuccess={loadFlags}
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
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <div className="h-5 bg-muted rounded animate-pulse w-32" />
                  <div className="h-5 bg-muted rounded animate-pulse w-16" />
                </div>
                <div className="h-5 bg-muted rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-destructive text-lg font-bold mb-2">
            Error loading flags
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={loadFlags}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (flags.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🚩</div>
          <h3 className="text-xl font-black mb-2">No Flags Yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first feature flag for {environment}
          </p>
          <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
            <Button>Create Flag</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FilterTabs
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
        <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
          <Button>Create Flag</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Values</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.map((flag) => (
                <TableRow key={flag.flagKey}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{flag.flagKey}</span>
                          {flag.version && (
                            <Badge variant="secondary" size="sm" className="font-mono text-xs">
                              v{flag.version}
                            </Badge>
                          )}
                          {(flag.isActive === undefined || flag.isActive) && (
                            <Badge status="active" size="sm">
                              Active
                            </Badge>
                          )}
                        </div>
                        {flag.name && flag.name !== flag.flagKey && (
                          <p className="text-xs text-muted-foreground mt-0.5">{flag.name}</p>
                        )}
                        {flag.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                            {flag.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm" className="font-mono text-xs uppercase">
                      {flag.flagType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 bg-info/10 text-info rounded">
                        A: {JSON.stringify(flag.valueA)}
                      </span>
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded">
                        B: {JSON.stringify(flag.valueB)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <ToggleFlagButton
                      platform={platform}
                      environment={environment}
                      flagKey={flag.flagKey}
                      enabled={flag.enabled}
                      onSuccess={loadFlags}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {flag.createdBy || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/evaluation?platform=${platform}&environment=${environment}&flagKey=${flag.flagKey}`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Test flag evaluation"
                      >
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <Link
                        href={`/platforms/${platform}/environments/${environment}/flags/${flag.flagKey}/stats`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View statistics"
                      >
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <VersionHistory
                        platform={platform}
                        environment={environment}
                        flagKey={flag.flagKey}
                        currentVersion={flag.version}
                        onVersionActivated={loadFlags}
                      />
                      <Link href={`/platforms/${platform}/environments/${environment}/flags/${flag.flagKey}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs">Edit</Button>
                      </Link>
                      {isAdmin && (
                        <DeleteFlagButton
                          platform={platform}
                          environment={environment}
                          flagKey={flag.flagKey}
                          onSuccess={loadFlags}
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

      {/* Quick stats summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {filteredFlags.length} flag{filteredFlags.length !== 1 ? 's' : ''} shown · {enabledCount} enabled total
        </span>
        <Link
          href={`/evaluation?platform=${platform}&environment=${environment}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Test evaluations <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function FlagsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Feature Flags</h1>
        <p className="text-muted-foreground">
          Manage feature flags with 2-value targeting
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div>Loading...</div>}>
          <PlatformEnvFilter />
        </Suspense>
      </div>

      <Suspense fallback={<div>Loading flags...</div>}>
        <FlagsContent />
      </Suspense>
    </div>
  );
}
