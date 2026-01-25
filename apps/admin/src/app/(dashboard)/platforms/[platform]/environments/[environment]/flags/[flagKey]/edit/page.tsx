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

  // Targeting - Country/Language Pairs
  const [countryLanguagePairs, setCountryLanguagePairs] = useState<
    { country: string; languages: string }[]
  >([]);
  const [forceIncludeUsers, setForceIncludeUsers] = useState('');
  const [forceExcludeUsers, setForceExcludeUsers] = useState('');

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

      // Convert API targeting format to UI format
      if (data.targeting?.countries?.length) {
        setCountryLanguagePairs(
          data.targeting.countries.map((c) => ({
            country: c.country,
            languages: c.languages?.map((l) => l.language).join(', ') || '',
          }))
        );
      } else {
        setCountryLanguagePairs([]);
      }
      setForceIncludeUsers(data.targeting?.forceIncludeUsers?.join(', ') || '');
      setForceExcludeUsers(data.targeting?.forceExcludeUsers?.join(', ') || '');
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

  // Country/Language pair management
  function addCountryLanguagePair() {
    setCountryLanguagePairs([...countryLanguagePairs, { country: '', languages: '' }]);
  }

  function updateCountryLanguagePair(
    index: number,
    update: Partial<{ country: string; languages: string }>
  ) {
    const updated = [...countryLanguagePairs];
    updated[index] = { ...updated[index], ...update };
    setCountryLanguagePairs(updated);
  }

  function removeCountryLanguagePair(index: number) {
    setCountryLanguagePairs(countryLanguagePairs.filter((_, i) => i !== index));
  }

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
      // Build targeting object like experiments
      const targeting: {
        countries?: { country: string; languages?: { language: string }[] }[];
        forceIncludeUsers?: string[];
        forceExcludeUsers?: string[];
      } = {};

      const validPairs = countryLanguagePairs.filter(p => p.country.trim());
      if (validPairs.length > 0) {
        targeting.countries = validPairs.map(pair => ({
          country: pair.country.trim().toUpperCase(),
          languages: pair.languages.trim()
            ? pair.languages.split(',').map(l => ({ language: l.trim().toLowerCase() }))
            : undefined,
        }));
      }

      const includeUsers = forceIncludeUsers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const excludeUsers = forceExcludeUsers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (includeUsers.length > 0) {
        targeting.forceIncludeUsers = includeUsers;
      }
      if (excludeUsers.length > 0) {
        targeting.forceExcludeUsers = excludeUsers;
      }

      await updateFlagApi(platform, environment, flagKey, {
        name: name.trim(),
        description: description.trim() || undefined,
        enabled,
        valueA: parseValue(valueA, flagType),
        valueB: parseValue(valueB, flagType),
        targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
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
            <CardTitle>Targeting (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Country/Language Pairs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Country/Language Targeting</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCountryLanguagePair}
                  disabled={isLoading}
                >
                  + Add Country
                </Button>
              </div>

              {countryLanguagePairs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No country targeting configured. Flag will apply to all users.
                </p>
              ) : (
                <div className="space-y-2">
                  {countryLanguagePairs.map((pair, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Country Code</Label>
                          <Input
                            value={pair.country}
                            onChange={(e) => updateCountryLanguagePair(index, { country: e.target.value })}
                            placeholder="e.g., AE"
                            disabled={isLoading}
                            className="uppercase"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Languages (comma-separated)</Label>
                          <Input
                            value={pair.languages}
                            onChange={(e) => updateCountryLanguagePair(index, { languages: e.target.value })}
                            placeholder="e.g., en, ar"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCountryLanguagePair(index)}
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Each country can have multiple languages. Leave languages empty for all languages in that country.
                  </p>
                </div>
              )}
            </div>

            {/* Force Include/Exclude Users */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="forceIncludeUsers">Force Include Users</Label>
                <Input
                  id="forceIncludeUsers"
                  value={forceIncludeUsers}
                  onChange={(e) => setForceIncludeUsers(e.target.value)}
                  placeholder="user123, user456"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">User IDs always included (comma-separated)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forceExcludeUsers">Force Exclude Users</Label>
                <Input
                  id="forceExcludeUsers"
                  value={forceExcludeUsers}
                  onChange={(e) => setForceExcludeUsers(e.target.value)}
                  placeholder="user789, user012"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">User IDs always excluded (comma-separated)</p>
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
