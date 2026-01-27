'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { createEnvironmentApi, getPlatformsApi } from '@/lib/api/platforms';
import type { Platform } from '@/lib/api/types';
import {
  Button,
  Input,
  Label,
  Select,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@togglebox/ui';

interface CreateEnvironmentPageProps {
  params: Promise<{
    platform: string;
  }>;
}

export default function CreateEnvironmentPage({ params }: CreateEnvironmentPageProps) {
  const { platform: initialPlatform } = use(params);
  const router = useRouter();

  // Platform selection
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState(initialPlatform || '');
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load platforms on mount
  useEffect(() => {
    setLoadingPlatforms(true);
    getPlatformsApi()
      .then(setPlatforms)
      .catch(console.error)
      .finally(() => setLoadingPlatforms(false));
  }, []);

  const platform = selectedPlatform;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!platform) {
      setError('Platform is required');
      setIsLoading(false);
      return;
    }

    if (!name?.trim()) {
      setError('Environment name is required');
      setIsLoading(false);
      return;
    }

    try {
      await createEnvironmentApi(platform, name.trim(), description.trim() || undefined);
      router.push(`/platforms/${platform}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Create Environment</h1>
            <p className="text-muted-foreground">
              {platform
                ? `Add a new environment to ${platform}`
                : 'Add a new environment to a platform'}
            </p>
          </div>
          <Link href={`/platforms/${initialPlatform}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select
                id="platform"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                disabled={isLoading || loadingPlatforms}
                required
              >
                <option value="">
                  {loadingPlatforms ? 'Loading...' : 'Select platform'}
                </option>
                {platforms.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Environment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Environment Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., production, staging, development"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this environment"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href={`/platforms/${initialPlatform}`}>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !platform}>
            {isLoading ? 'Creating...' : 'Create Environment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
