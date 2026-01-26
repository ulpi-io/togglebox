'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { getConfigVersionsApi, createConfigVersionApi } from '@/lib/api/configs';
import type { ConfigVersion } from '@/lib/api/types';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@togglebox/ui';
import { JsonEditor } from '@/components/configs/json-editor';

interface EditConfigPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    version: string;
  }>;
}

/**
 * Bumps a semantic version string.
 */
function bumpVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
  const parts = currentVersion.split('.');
  if (parts.length === 3) {
    const [major, minor, patch] = parts.map((p) => parseInt(p, 10));
    if (!isNaN(major) && !isNaN(minor) && !isNaN(patch)) {
      switch (type) {
        case 'major':
          return `${major + 1}.0.0`;
        case 'minor':
          return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
          return `${major}.${minor}.${patch + 1}`;
      }
    }
  }
  return `${currentVersion}.1`;
}

export default function EditConfigPage({ params }: EditConfigPageProps) {
  const { platform, environment, version: currentVersion } = use(params);
  const router = useRouter();

  const [config, setConfig] = useState<ConfigVersion | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields
  const [newVersion, setNewVersion] = useState('');
  const [configJson, setConfigJson] = useState('{}');
  const [isStable, setIsStable] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setIsLoadingConfig(true);
      const versions = await getConfigVersionsApi(platform, environment);
      const currentConfig = versions.find(v => v.versionLabel === currentVersion);
      if (currentConfig) {
        setConfig(currentConfig);
        setConfigJson(JSON.stringify(currentConfig.config, null, 2));
        setNewVersion(bumpVersion(currentConfig.versionLabel));
        setIsStable(currentConfig.isStable);
        setLoadError(null);
      } else {
        setLoadError('Config version not found');
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoadingConfig(false);
    }
  }, [platform, environment, currentVersion]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!newVersion?.trim()) {
      setError('Version is required');
      setIsLoading(false);
      return;
    }

    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = JSON.parse(configJson);
    } catch {
      setError('Invalid JSON configuration');
      setIsLoading(false);
      return;
    }

    try {
      await createConfigVersionApi(platform, environment, newVersion.trim(), parsedConfig, isStable);
      router.push(`/platforms/${platform}/environments/${environment}/configs/${newVersion.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingConfig) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Config</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Config</h1>
          <p className="text-muted-foreground">{platform} / {environment}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading config
            </div>
            <p className="text-muted-foreground mb-4">{loadError || 'Config not found'}</p>
            <Link href={`/configs?platform=${platform}&environment=${environment}`}>
              <Button variant="outline">Back to Configs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black">Edit Config</h1>
              {config.isStable && (
                <Badge variant="default">STABLE</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {platform} / {environment} / v{currentVersion}
            </p>
          </div>
          <Link href={`/configs?platform=${platform}&environment=${environment}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      {/* Info banner */}
      <Alert className="mb-6">
        <div className="font-bold">Creating a New Version</div>
        <p className="text-sm">
          Configs are immutable. Editing creates a new version based on v{currentVersion}.
          Suggested new version: <strong>{bumpVersion(currentVersion)}</strong>
        </p>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Version */}
        <Card>
          <CardHeader>
            <CardTitle>New Version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Current Version</Label>
                <Input value={currentVersion} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newVersion">New Version *</Label>
                <Input
                  id="newVersion"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="e.g., 1.0.1"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Suggested: {bumpVersion(currentVersion)} (patch bump from {currentVersion})
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="isStable"
                checked={isStable}
                onChange={(e) => setIsStable(e.target.checked)}
                disabled={isLoading}
              />
              <Label htmlFor="isStable" className="cursor-pointer">
                Mark as stable (recommended for production)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Config JSON */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonEditor
              name="config"
              value={configJson}
              onChange={setConfigJson}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href={`/configs?platform=${platform}&environment=${environment}`}>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create New Version'}
          </Button>
        </div>
      </form>
    </div>
  );
}
