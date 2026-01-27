'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@togglebox/ui';
import { browserApiClient } from '@/lib/api/browser-client';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { ConfigVersion, User } from '@/lib/api/types';

interface ConfigDetailPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    version: string;
  }>;
}

export default function ConfigDetailPage({ params }: ConfigDetailPageProps) {
  const { platform, environment, version } = use(params);
  const router = useRouter();
  const [config, setConfig] = useState<ConfigVersion | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingStable, setIsMarkingStable] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await browserApiClient<ConfigVersion>(
        `/api/v1/platforms/${platform}/environments/${environment}/versions/${version}`
      );
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config version');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment, version]);

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
    loadConfig();
    loadUser();
  }, [loadConfig, loadUser]);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete version ${version}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await browserApiClient(
        `/api/v1/internal/platforms/${platform}/environments/${environment}/versions/${version}`,
        { method: 'DELETE' }
      );
      router.push(`/configs?platform=${platform}&environment=${environment}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete version');
      setIsDeleting(false);
    }
  }

  async function handleMarkStable() {
    setIsMarkingStable(true);
    try {
      await browserApiClient(
        `/api/v1/internal/platforms/${platform}/environments/${environment}/versions/${version}/mark-stable`,
        { method: 'PATCH' }
      );
      // Reload the config to get updated isStable status
      const data = await browserApiClient<ConfigVersion>(
        `/api/v1/platforms/${platform}/environments/${environment}/versions/${version}`
      );
      setConfig(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark as stable');
    } finally {
      setIsMarkingStable(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-10 bg-muted rounded animate-pulse w-48 mb-2" />
          <div className="h-4 bg-muted rounded animate-pulse w-64" />
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Version Not Found</h1>
            <p className="text-muted-foreground">
              {platform} / {environment} / {version}
            </p>
          </div>
          <Link href={`/configs?platform=${platform}&environment=${environment}`}>
            <Button variant="outline">Back to Configs</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              {error || 'Version not found'}
            </div>
            <p className="text-muted-foreground">
              The requested remote config version could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-4xl font-black">v{config.versionLabel}</h1>
            {config.isStable && (
              <Badge variant="default" size="sm">STABLE</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          {!config.isStable && (
            <Button
              onClick={handleMarkStable}
              disabled={isMarkingStable}
              variant="outline"
            >
              {isMarkingStable ? 'Marking...' : 'Mark as Stable'}
            </Button>
          )}
          <Link href={`/platforms/${platform}/environments/${environment}/configs/${version}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          {isAdmin && (
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <Link href={`/configs?platform=${platform}&environment=${environment}`}>
            <Button variant="outline">Back to Configs</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Version Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-bold text-muted-foreground">Version</div>
                <div className="font-mono">{config.versionLabel}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Status</div>
                <div>{config.isStable ? 'Stable' : 'Unstable'}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Created At</div>
                <div>{new Date(config.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Created By</div>
                <div>{config.createdBy}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remote Config</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted border border-black/10 rounded-lg overflow-x-auto text-sm font-mono">
              {JSON.stringify(config.config, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
