'use client';

import { useState } from 'react';
import { invalidateCacheAction, invalidateAllCacheAction } from '@/actions/cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function CachePage() {
  const [platform, setPlatform] = useState('');
  const [environment, setEnvironment] = useState('');
  const [version, setVersion] = useState('');

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInvalidating, setIsInvalidating] = useState(false);

  async function handleInvalidate() {
    setIsInvalidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await invalidateCacheAction(
        platform || undefined,
        environment || undefined,
        version || undefined
      );

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'Failed to invalidate cache');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to invalidate cache');
    } finally {
      setIsInvalidating(false);
    }
  }

  async function handleInvalidateAll() {
    if (!confirm('Are you sure you want to invalidate ALL caches? This will affect all platforms and environments.')) {
      return;
    }

    setIsInvalidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await invalidateAllCacheAction();

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'Failed to invalidate all caches');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to invalidate all caches');
    } finally {
      setIsInvalidating(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Cache Management</h1>
        <p className="text-muted-foreground">
          Invalidate CloudFront caches for updated configurations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Granular Invalidation */}
        <Card>
          <CardHeader>
            <CardTitle>Granular Cache Invalidation</CardTitle>
            <CardDescription>
              Invalidate cache for specific platform/environment/version
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform (optional)</Label>
              <Input
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g., web, mobile"
                disabled={isInvalidating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment (optional)</Label>
              <Input
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g., production, staging"
                disabled={isInvalidating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version (optional)</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.0.0"
                disabled={isInvalidating}
              />
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-gray-50 border-2 border-black">
              <div className="font-bold mb-1">Examples:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Platform only: Invalidate all caches for "web"</li>
                <li>Platform + Environment: Invalidate "web/production"</li>
                <li>All fields: Invalidate specific version</li>
              </ul>
            </div>

            <Button onClick={handleInvalidate} disabled={isInvalidating} className="w-full">
              {isInvalidating ? 'Invalidating...' : 'Invalidate Cache'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Invalidation Result</CardTitle>
            <CardDescription>Status of cache invalidation request</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !error && (
              <div className="text-center py-12 text-muted-foreground">
                Configure invalidation settings and click "Invalidate Cache"
              </div>
            )}

            {error && (
              <div className="border-2 border-destructive p-4">
                <div className="text-sm font-bold text-destructive mb-2">Error</div>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="border-2 border-black p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-4xl">✅</div>
                    <div>
                      <div className="text-lg font-black">Success</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                    </div>
                  </div>

                  {result.invalidatedPaths && result.invalidatedPaths.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-bold mb-2">Invalidated Paths:</div>
                      <ul className="list-disc list-inside text-xs font-mono space-y-1 text-muted-foreground">
                        {result.invalidatedPaths.map((path: string, index: number) => (
                          <li key={index}>{path}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Cache invalidation may take 1-2 minutes to propagate to all edge locations.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Invalidation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Global Cache Invalidation</CardTitle>
          <CardDescription>
            ⚠️ WARNING: This will invalidate ALL caches across all platforms and environments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleInvalidateAll}
            disabled={isInvalidating}
            className="w-full"
          >
            {isInvalidating ? 'Invalidating All...' : 'Invalidate All Caches'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
