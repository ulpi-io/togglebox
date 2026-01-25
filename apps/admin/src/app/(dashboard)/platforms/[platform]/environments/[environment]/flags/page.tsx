'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { getFlagsApi } from '@/lib/api/flags';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Flag, User } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@togglebox/ui';
import { ToggleFlagButton } from '@/components/flags/toggle-flag-button';
import { DeleteFlagButton } from '@/components/flags/delete-flag-button';
import { VersionHistory } from '@/components/flags/version-history';

interface FlagsPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

/**
 * Flags Page - Three-Tier Architecture Tier 2
 * Displays flags with 2-value model (valueA/valueB).
 */
export default function FlagsPage({ params }: FlagsPageProps) {
  const { platform, environment } = use(params);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const loadFlags = useCallback(async () => {
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
      // User fetch failed - proceed without role-based features
      console.error('Failed to fetch user:', err);
    }
  }, []);

  useEffect(() => {
    loadFlags();
    loadUser();
  }, [loadFlags, loadUser]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Flags</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
              <Button>Create Flag</Button>
            </Link>
            <Link href={`/platforms/${platform}`}>
              <Button variant="outline">Back to {platform}</Button>
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-48 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-64" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
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
            <h1 className="text-4xl font-black mb-2">Flags</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
              <Button>Create Flag</Button>
            </Link>
            <Link href={`/platforms/${platform}`}>
              <Button variant="outline">Back to {platform}</Button>
            </Link>
          </div>
        </div>
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
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Flags</h1>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
              <Button>Create Flag</Button>
            </Link>
          <Link href={`/platforms/${platform}`}>
            <Button variant="outline">Back to {platform}</Button>
          </Link>
        </div>
      </div>

      {flags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🚩</div>
            <h3 className="text-xl font-black mb-2">No Flags Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first flag for {environment}
            </p>
            <Link href={`/platforms/${platform}/environments/${environment}/flags/create`}>
              <Button>Create Flag</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <Card key={flag.flagKey}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-2xl font-black">
                        {flag.flagKey}
                      </CardTitle>
                      {flag.version && (
                        <Badge variant="secondary" size="sm" className="font-mono">
                          v{flag.version}
                        </Badge>
                      )}
                      {(flag.isActive === undefined || flag.isActive) && (
                        <Badge status="active" size="sm">ACTIVE</Badge>
                      )}
                      <Badge
                        variant={flag.enabled ? 'default' : 'secondary'}
                        size="sm"
                      >
                        {flag.enabled ? 'ENABLED' : 'DISABLED'}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {flag.flagType.toUpperCase()}
                      </Badge>
                    </div>
                    {flag.name && flag.name !== flag.flagKey && (
                      <p className="text-sm font-medium mt-1">{flag.name}</p>
                    )}
                    {flag.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {flag.description}
                      </p>
                    )}
                  </div>
                  <ToggleFlagButton
                    platform={platform}
                    environment={environment}
                    flagKey={flag.flagKey}
                    enabled={flag.enabled}
                    onSuccess={loadFlags}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 2-Value Model Display */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-bold">Value A (default)</div>
                    <div className="text-muted-foreground font-mono">
                      {JSON.stringify(flag.valueA)}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold">Value B (rollout)</div>
                    <div className="text-muted-foreground font-mono">
                      {JSON.stringify(flag.valueB)}
                    </div>
                  </div>
                </div>

                {/* Targeting Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {flag.targeting?.countries?.length > 0 && (
                    <div>
                      <div className="font-bold">Target Countries</div>
                      <div className="text-muted-foreground">
                        {flag.targeting.countries.map((c) => c.country).join(', ')}
                      </div>
                    </div>
                  )}

                  {flag.targeting?.countries?.some((c) => c.languages?.length) && (
                    <div>
                      <div className="font-bold">Target Languages</div>
                      <div className="text-muted-foreground">
                        {[...new Set(
                          flag.targeting.countries
                            .flatMap((c) => c.languages?.map((l) => l.language) || [])
                        )].join(', ')}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="font-bold">Created</div>
                    <div className="text-muted-foreground">
                      {new Date(flag.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold">Created By</div>
                    <div className="text-muted-foreground">{flag.createdBy}</div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-black/10">
                  <VersionHistory
                    platform={platform}
                    environment={environment}
                    flagKey={flag.flagKey}
                    currentVersion={flag.version}
                    onVersionActivated={loadFlags}
                  />
                  <Link href={`/platforms/${platform}/environments/${environment}/flags/${flag.flagKey}/edit`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        Edit
                      </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
