'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { createFlagApi } from '@/lib/api/flags';
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

interface CreateFlagPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

type FlagType = 'boolean' | 'string' | 'number';

export default function CreateFlagPage({ params }: CreateFlagPageProps) {
  const { platform: initialPlatform, environment: initialEnvironment } = use(params);
  const router = useRouter();

  // Platform/Environment selection
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState(initialPlatform || '');
  const [selectedEnvironment, setSelectedEnvironment] = useState(initialEnvironment || '');
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
      if (selectedPlatform !== initialPlatform) {
        setSelectedEnvironment('');
      }
      getEnvironmentsApi(selectedPlatform)
        .then(setEnvironments)
        .catch(console.error)
        .finally(() => setLoadingEnvironments(false));
    }
  }, [selectedPlatform, initialPlatform]);

  const platform = selectedPlatform;
  const environment = selectedEnvironment;

  // Basic fields
  const [flagKey, setFlagKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [flagType, setFlagType] = useState<FlagType>('boolean');
  const [enabled, setEnabled] = useState(false);

  // 2-value model
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

  // Parse value based on flag type
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

  // Handle flag type change - reset values to sensible defaults
  function handleFlagTypeChange(newType: FlagType) {
    setFlagType(newType);
    switch (newType) {
      case 'boolean':
        setValueA('true');
        setValueB('false');
        break;
      case 'string':
        setValueA('');
        setValueB('');
        break;
      case 'number':
        setValueA('0');
        setValueB('0');
        break;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!flagKey?.trim()) {
      setError('Flag key is required');
      setIsLoading(false);
      return;
    }

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

      await createFlagApi(platform, environment, {
        flagKey: flagKey.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        enabled,
        flagType,
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

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Create Flag</h1>
            <p className="text-muted-foreground">
              {platform && environment
                ? `Add a new feature flag for ${platform} / ${environment}`
                : 'Add a new feature flag'}
            </p>
          </div>
          <Link href={`/platforms/${initialPlatform}/environments/${initialEnvironment}/flags`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform/Environment Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
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
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="flagKey">Flag Key *</Label>
                <Input
                  id="flagKey"
                  value={flagKey}
                  onChange={(e) => setFlagKey(e.target.value)}
                  placeholder="e.g., dark_mode"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Use snake_case for consistency
                </p>
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="flagType">Flag Type</Label>
              <Select
                id="flagType"
                value={flagType}
                onChange={(e) => handleFlagTypeChange(e.target.value as FlagType)}
                disabled={isLoading}
              >
                <option value="boolean">Boolean (true/false)</option>
                <option value="string">String (text values)</option>
                <option value="number">Number (numeric values)</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 2-Value Model */}
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
                Enable flag immediately
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
          <Link href={`/platforms/${initialPlatform}/environments/${initialEnvironment}/flags`}>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !platform || !environment}>
            {isLoading ? 'Creating...' : 'Create Flag'}
          </Button>
        </div>
      </form>
    </div>
  );
}
