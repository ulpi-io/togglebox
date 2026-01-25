'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPlatformsApi } from '@/lib/api/platforms';
import type { Platform } from '@/lib/api/types';
import { Button, Card, CardContent, Skeleton } from '@togglebox/ui';
import { DeletePlatformButton } from '@/components/platforms/delete-platform-button';
import { ChevronRight } from 'lucide-react';

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlatforms = async () => {
    try {
      setIsLoading(true);
      const data = await getPlatformsApi();
      setPlatforms(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlatforms();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platforms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your platforms and their environments
          </p>
        </div>
        <Link href="/platforms/create">
          <Button>Create Platform</Button>
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <div className="divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-semibold mb-2">
              Error loading platforms
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadPlatforms} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : platforms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">No Platforms Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first platform to get started with ToggleBox
            </p>
            <Link href="/platforms/create">
              <Button>Create Platform</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg truncate">
                      {platform.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(platform.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {platform.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {platform.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <DeletePlatformButton
                    platform={platform.name}
                    onSuccess={loadPlatforms}
                  />
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/platforms/${platform.name}`}>
                      Manage
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
