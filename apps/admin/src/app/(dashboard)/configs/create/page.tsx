'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createConfigVersionApi } from '@/lib/api/configs';
import { getPlatformsApi, getEnvironmentsApi } from '@/lib/api/platforms';
import type { Platform, Environment } from '@/lib/api/types';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@togglebox/ui';
import { JsonEditor } from '@/components/configs/json-editor';

export default function CreateConfigPage() {
  const router = useRouter();

  // Platform/Environment selection
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    setLoadingPlatforms(true);
    getPlatformsApi()
      .then(setPlatforms)
      .catch(console.error)
      .finally(() => setLoadingPlatforms(false));
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (selectedPlatform) {
      setLoadingEnvironments(true);
      setSelectedEnvironment('');
      getEnvironmentsApi(selectedPlatform)
        .then(setEnvironments)
        .catch(console.error)
        .finally(() => setLoadingEnvironments(false));
    }
  }, [selectedPlatform]);

  const platform = selectedPlatform;
  const environment = selectedEnvironment;

  // Form fields
  const [version, setVersion] = useState('');
  const [configJson, setConfigJson] = useState('{}');
  const [isStable, setIsStable] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!version?.trim()) {
      setError('Version is required');
      setIsLoading(false);
      return;
    }

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(configJson);
    } catch {
      setError('Invalid JSON configuration');
      setIsLoading(false);
      return;
    }

    try {
      await createConfigVersionApi(platform, environment, version.trim(), config, isStable);
      router.push(`/platforms/${platform}/environments/${environment}/configs`);
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
            <Link
              href="/configs"
              className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block"
            >
              ← Back to configs
            </Link>
            <h1 className="text-4xl font-black mb-2">Create Config Version</h1>
            <p className="text-muted-foreground">
              {platform && environment
                ? `Deploy a new remote config for ${platform} / ${environment}`
                : 'Deploy a new remote config version'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location and Version - Side by side on wide screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform/Environment Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="environment">Environment *</Label>
                <Select
                  id="environment"
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  disabled={isLoading || loadingEnvironments || !selectedPlatform}
                  required
                >
                  <option value="">
                    {loadingEnvironments ? 'Loading...' : selectedPlatform ? 'Select environment' : 'Select platform first'}
                  </option>
                  {environments.map((env) => (
                    <option key={env.environment} value={env.environment}>
                      {env.environment}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Version */}
          <Card>
            <CardHeader>
              <CardTitle>Version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 1.0.0"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Use semantic versioning (e.g., 1.0.0, 1.2.3)
                </p>
              </div>

              <div className="flex items-center gap-3">
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
        </div>

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
          <Link href="/configs">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !platform || !environment}>
            {isLoading ? 'Creating...' : 'Create Version'}
          </Button>
        </div>
      </form>
    </div>
  );
}
