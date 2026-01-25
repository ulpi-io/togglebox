'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { getFlagsApi } from '@/lib/api/flags';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Flag, User } from '@/lib/api/types';
import { Badge, Button, Card, CardContent } from '@togglebox/ui';
import { ToggleFlagButton } from '@/components/flags/toggle-flag-button';
import { DeleteFlagButton } from '@/components/flags/delete-flag-button';
import { VersionHistory } from '@/components/flags/version-history';
import { PlatformEnvFilter, usePlatformEnvFilter } from '@/components/filters/platform-env-filter';
import { BarChart3, ChevronRight } from 'lucide-react';

function FlagsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const loadFlags = useCallback(async () => {
    if (!platform || !environment) {
      setFlags([]);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getFlagsApi(platform, environment);
      setFlags(data);
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

  if (!hasSelection) {
    return null;
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
      <div className="flex justify-end">
        <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
          <Button>Create Flag</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-3 px-4 font-black text-sm">Flag</th>
                  <th className="text-left py-3 px-4 font-black text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-black text-sm">Values</th>
                  <th className="text-center py-3 px-4 font-black text-sm">Status</th>
                  <th className="text-right py-3 px-4 font-black text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr
                    key={flag.flagKey}
                    className="border-b border-black/5 last:border-0 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-4 px-4">
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
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" size="sm" className="font-mono text-xs uppercase">
                        {flag.flagType}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 bg-info/10 text-info rounded">
                          A: {JSON.stringify(flag.valueA)}
                        </span>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded">
                          B: {JSON.stringify(flag.valueB)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ToggleFlagButton
                        platform={platform}
                        environment={environment}
                        flagKey={flag.flagKey}
                        enabled={flag.enabled}
                        onSuccess={loadFlags}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/evaluation?platform=${platform}&environment=${environment}&flagKey=${flag.flagKey}`}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Test flag evaluation"
                        >
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {flags.length} flag{flags.length !== 1 ? 's' : ''} · {flags.filter(f => f.enabled).length} enabled
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
