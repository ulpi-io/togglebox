'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { getFlagApi, updateFlagApi } from '@/lib/api/flags';
import type { Flag } from '@/lib/api/types';
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

interface EditFlagPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    flagKey: string;
  }>;
}

type FlagType = 'boolean' | 'string' | 'number';

export default function EditFlagPage({ params }: EditFlagPageProps) {
  const { platform, environment, flagKey } = use(params);
  const router = useRouter();

  const [flag, setFlag] = useState<Flag | null>(null);
  const [isLoadingFlag, setIsLoadingFlag] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [flagType, setFlagType] = useState<FlagType>('boolean');
  const [valueA, setValueA] = useState<string>('true');
  const [valueB, setValueB] = useState<string>('false');
  const [targetCountries, setTargetCountries] = useState('');
  const [targetLanguages, setTargetLanguages] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlag = useCallback(async () => {
    try {
      setIsLoadingFlag(true);
      const data = await getFlagApi(platform, environment, flagKey);
      setFlag(data);
      setName(data.name);
      setDescription(data.description || '');
      setEnabled(data.enabled);
      setFlagType(data.flagType || 'boolean');
      setValueA(String(data.valueA));
      setValueB(String(data.valueB));
      setTargetCountries(
        data.targeting?.countries?.map((c) => c.country).join(', ') || ''
      );
      setTargetLanguages(
        data.targeting?.countries?.[0]?.languages?.map((l) => l.language).join(', ') || ''
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load flag');
    } finally {
      setIsLoadingFlag(false);
    }
  }, [platform, environment, flagKey]);

  useEffect(() => {
    loadFlag();
  }, [loadFlag]);

  function parseValue(raw: string, type: FlagType): boolean | string | number {
    switch (type) {
      case 'boolean':
        return raw === 'true';
      case 'number':
        return parseFloat(raw) || 0;
      default:
        return raw;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!name?.trim()) {
      setError('Flag name is required');
      setIsLoading(false);
      return;
    }

    try {
      await updateFlagApi(platform, environment, flagKey, {
        name: name.trim(),
        description: description.trim() || undefined,
        enabled,
        valueA: parseValue(valueA, flagType),
        valueB: parseValue(valueB, flagType),
        targetCountries: targetCountries
          ? targetCountries.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        targetLanguages: targetLanguages
          ? targetLanguages.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });

      router.push(`/platforms/${platform}/environments/${environment}/flags`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingFlag) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Flag</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !flag) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Flag</h1>
          <p className="text-muted-foreground">{platform} / {environment}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading flag
            </div>
            <p className="text-muted-foreground mb-4">{loadError || 'Flag not found'}</p>
            <Link href={`/platforms/${platform}/environments/${environment}/flags`}>
              <Button variant="outline">Back to Flags</Button>
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
            <h1 className="text-4xl font-black mb-2">Edit Flag</h1>
            <p className="text-muted-foreground">
              {platform} / {environment} / {flagKey}
            </p>
          </div>
          <Link href={`/platforms/${platform}/environments/${environment}/flags`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Read-only fields */}
        <Card>
          <CardHeader>
            <CardTitle>Flag Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Flag Key (immutable)</Label>
              <Input value={flag.flagKey} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Flag Type (immutable)</Label>
              <Input
                value={flagType === 'boolean' ? 'Boolean' : flagType === 'string' ? 'String' : 'Number'}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Editable fields */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Dark Mode"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this flag"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Values */}
        <Card>
          <CardHeader>
            <CardTitle>Values (2-value model)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="valueA">Value A (default)</Label>
                {flagType === 'boolean' ? (
                  <Select
                    id="valueA"
                    value={valueA}
                    onChange={(e) => setValueA(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </Select>
                ) : (
                  <Input
                    id="valueA"
                    type={flagType === 'number' ? 'number' : 'text'}
                    value={valueA}
                    onChange={(e) => setValueA(e.target.value)}
                    placeholder={flagType === 'number' ? '0' : 'value'}
                    disabled={isLoading}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valueB">Value B (rollout)</Label>
                {flagType === 'boolean' ? (
                  <Select
                    id="valueB"
                    value={valueB}
                    onChange={(e) => setValueB(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </Select>
                ) : (
                  <Input
                    id="valueB"
                    type={flagType === 'number' ? 'number' : 'text'}
                    value={valueB}
                    onChange={(e) => setValueB(e.target.value)}
                    placeholder={flagType === 'number' ? '0' : 'value'}
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Targeting */}
        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="targetCountries">Target Countries</Label>
                <Input
                  id="targetCountries"
                  value={targetCountries}
                  onChange={(e) => setTargetCountries(e.target.value)}
                  placeholder="US, UK, CA"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">ISO country codes, comma-separated</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetLanguages">Target Languages</Label>
                <Input
                  id="targetLanguages"
                  value={targetLanguages}
                  onChange={(e) => setTargetLanguages(e.target.value)}
                  placeholder="en, es, fr"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">ISO language codes, comma-separated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enable Flag */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Checkbox
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={isLoading}
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Flag enabled
              </Label>
            </div>
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
          <Link href={`/platforms/${platform}/environments/${environment}/flags`}>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
