"use client";

import { useState, useEffect } from "react";
import {
  invalidateCacheApi,
  invalidateAllCacheApi,
  CacheInvalidationResult,
} from "@/lib/api/cache";
import { getPlatformsApi, getEnvironmentsApi } from "@/lib/api/platforms";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Button,
  Select,
} from "@togglebox/ui";
import type { Platform, Environment } from "@/lib/api/types";

export default function CachePage() {
  // Selection states
  const [platform, setPlatform] = useState("");
  const [environment, setEnvironment] = useState("");

  // Data states
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  // Loading states
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);

  const [result, setResult] = useState<CacheInvalidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInvalidating, setIsInvalidating] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    async function loadPlatforms() {
      try {
        const data = await getPlatformsApi();
        setPlatforms(data);
      } catch (err) {
        console.error("Failed to load platforms:", err);
      } finally {
        setIsLoadingPlatforms(false);
      }
    }
    loadPlatforms();
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (!platform) {
      setEnvironments([]);
      setEnvironment("");
      return;
    }

    async function loadEnvironments() {
      setIsLoadingEnvironments(true);
      try {
        const data = await getEnvironmentsApi(platform);
        setEnvironments(data);
        setEnvironment("");
      } catch (err) {
        console.error("Failed to load environments:", err);
        setEnvironments([]);
      } finally {
        setIsLoadingEnvironments(false);
      }
    }
    loadEnvironments();
  }, [platform]);

  async function handleInvalidate() {
    setIsInvalidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await invalidateCacheApi(
        platform || undefined,
        environment || undefined,
      );
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to invalidate cache",
      );
    } finally {
      setIsInvalidating(false);
    }
  }

  async function handleInvalidateAll() {
    if (
      !confirm(
        "Are you sure you want to invalidate ALL caches? This will affect all platforms and environments.",
      )
    ) {
      return;
    }

    setIsInvalidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await invalidateAllCacheApi();
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to invalidate all caches",
      );
    } finally {
      setIsInvalidating(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Cache Management</h1>
        <p className="text-muted-foreground">
          Invalidate CDN caches for updated remote config parameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Granular Invalidation */}
        <Card>
          <CardHeader>
            <CardTitle>Granular Cache Invalidation</CardTitle>
            <CardDescription>
              Invalidate cache for specific platform/environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform (optional)</Label>
              <Select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isInvalidating || isLoadingPlatforms}
              >
                <option value="">
                  {isLoadingPlatforms
                    ? "Loading platforms..."
                    : "All platforms"}
                </option>
                {platforms.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment (optional)</Label>
              <Select
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                disabled={isInvalidating || !platform || isLoadingEnvironments}
              >
                <option value="">
                  {!platform
                    ? "Select a platform first"
                    : isLoadingEnvironments
                      ? "Loading environments..."
                      : "All environments"}
                </option>
                {environments.map((e) => (
                  <option key={e.environment} value={e.environment}>
                    {e.environment}
                  </option>
                ))}
              </Select>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted border border-black/10 rounded-lg">
              <div className="font-bold mb-1">Invalidation Scope:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>No selection: Invalidate all config caches</li>
                <li>Platform only: Invalidate all caches for that platform</li>
                <li>
                  Platform + Environment: Invalidate that environment&apos;s
                  config cache
                </li>
              </ul>
            </div>

            <Button
              onClick={handleInvalidate}
              disabled={isInvalidating}
              className="w-full"
            >
              {isInvalidating ? "Invalidating..." : "Invalidate Cache"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Invalidation Result</CardTitle>
            <CardDescription>
              Status of cache invalidation request
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !error && (
              <div className="text-center py-12 text-muted-foreground">
                Configure invalidation settings and click &quot;Invalidate
                Cache&quot;
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <div className="text-sm font-bold mb-1">Error</div>
                <p className="text-sm">{error}</p>
              </Alert>
            )}

            {result && (
              <div className="space-y-4">
                <Alert variant="success">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-3xl">✓</div>
                    <div>
                      <div className="text-lg font-black">Success</div>
                      <div className="text-sm opacity-80">{result.message}</div>
                    </div>
                  </div>

                  {result.invalidatedPaths &&
                    result.invalidatedPaths.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-success/20">
                        <div className="text-sm font-bold mb-2">
                          Invalidated Paths:
                        </div>
                        <ul className="list-disc list-inside text-xs font-mono space-y-1 opacity-80">
                          {result.invalidatedPaths.map(
                            (path: string, index: number) => (
                              <li key={index}>{path}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </Alert>

                <div className="text-xs text-muted-foreground">
                  Cache invalidation may take 1-2 minutes to propagate to all
                  edge locations.
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
            WARNING: This will invalidate ALL caches across all platforms and
            environments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleInvalidateAll}
            disabled={isInvalidating}
            className="w-full"
          >
            {isInvalidating ? "Invalidating All..." : "Invalidate All Caches"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
