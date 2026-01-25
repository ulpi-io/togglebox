'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { createExperimentApi } from '@/lib/api/experiments';
import { getPlatformsApi, getEnvironmentsApi } from '@/lib/api/platforms';
import type { Platform, Environment } from '@/lib/api/types';
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
  Badge,
} from '@togglebox/ui';

interface CreateExperimentPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

interface Variation {
  key: string;
  name: string;
  value: string;
  isControl: boolean;
  percentage: number;
}

interface CountryLanguagePair {
  country: string;
  languages: string;
}

const VARIANT_COLORS = [
  { border: 'border-info/50', bg: 'bg-info/10' },
  { border: 'border-success/50', bg: 'bg-success/10' },
  { border: 'border-warning/50', bg: 'bg-warning/10' },
  { border: 'border-destructive/50', bg: 'bg-destructive/10' },
  { border: 'border-purple-500/50', bg: 'bg-purple-50' },
  { border: 'border-pink-500/50', bg: 'bg-pink-50' },
];

export default function CreateExperimentPage({ params }: CreateExperimentPageProps) {
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
  const [experimentKey, setExperimentKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  // Multi-variant support
  const [variations, setVariations] = useState<Variation[]>([
    { key: 'control', name: 'Control', value: '', isControl: true, percentage: 50 },
    { key: 'variant_1', name: 'Variant 1', value: '', isControl: false, percentage: 50 },
  ]);

  // Targeting
  const [countryLanguagePairs, setCountryLanguagePairs] = useState<CountryLanguagePair[]>([]);
  const [forceIncludeUsers, setForceIncludeUsers] = useState('');
  const [forceExcludeUsers, setForceExcludeUsers] = useState('');

  // Primary metric
  const [metricName, setMetricName] = useState('');
  const [metricEventName, setMetricEventName] = useState('');
  const [metricType, setMetricType] = useState<'conversion' | 'count' | 'sum' | 'average'>('conversion');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPercentage = variations.reduce((sum, v) => sum + v.percentage, 0);

  function getVariationLabel(index: number, isControl: boolean): string {
    if (isControl) return 'Control';
    let variantNumber = 0;
    for (let i = 0; i <= index; i++) {
      if (!variations[i].isControl) variantNumber++;
    }
    return `Variant ${variantNumber}`;
  }

  function updateVariation(index: number, updates: Partial<Variation>) {
    setVariations(prev => prev.map((v, i) => i === index ? { ...v, ...updates } : v));
  }

  function addVariation() {
    if (variations.length >= 6) return;

    const variantCount = variations.filter(v => !v.isControl).length + 1;
    const newKey = `variant_${variantCount}`;
    const newName = `Variant ${variantCount}`;

    const newCount = variations.length + 1;
    const evenPercentage = Math.floor(100 / newCount);
    const remainder = 100 - (evenPercentage * newCount);

    const updatedVariations = variations.map((v, i) => ({
      ...v,
      percentage: evenPercentage + (i === 0 ? remainder : 0),
    }));

    setVariations([
      ...updatedVariations,
      { key: newKey, name: newName, value: '', isControl: false, percentage: evenPercentage },
    ]);
  }

  function removeVariation(index: number) {
    if (variations.length <= 2) return;
    if (variations[index].isControl) return;

    const removedPercentage = variations[index].percentage;
    const remaining = variations.filter((_, i) => i !== index);

    const updatedVariations = remaining.map(v =>
      v.isControl ? { ...v, percentage: v.percentage + removedPercentage } : v
    );

    let variantNum = 0;
    const renumbered = updatedVariations.map(v => {
      if (v.isControl) return v;
      variantNum++;
      return { ...v, key: `variant_${variantNum}`, name: `Variant ${variantNum}` };
    });

    setVariations(renumbered);
  }

  function distributeEvenly() {
    const count = variations.length;
    const evenPercentage = Math.floor(100 / count);
    const remainder = 100 - (evenPercentage * count);

    setVariations(prev => prev.map((v, i) => ({
      ...v,
      percentage: evenPercentage + (i === 0 ? remainder : 0),
    })));
  }

  function setAsControl(index: number) {
    setVariations(prev => {
      const updated = prev.map((v, i) => ({
        ...v,
        isControl: i === index,
        key: i === index ? 'control' : v.key,
        name: i === index ? 'Control' : v.name,
      }));
      let variantNum = 0;
      return updated.map(v => {
        if (v.isControl) return v;
        variantNum++;
        return { ...v, key: `variant_${variantNum}`, name: `Variant ${variantNum}` };
      });
    });
  }

  function addCountryLanguagePair() {
    setCountryLanguagePairs(prev => [...prev, { country: '', languages: '' }]);
  }

  function updateCountryLanguagePair(index: number, updates: Partial<CountryLanguagePair>) {
    setCountryLanguagePairs(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  }

  function removeCountryLanguagePair(index: number) {
    setCountryLanguagePairs(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!experimentKey?.trim()) {
      setError('Experiment key is required');
      setIsLoading(false);
      return;
    }

    if (!name?.trim()) {
      setError('Experiment name is required');
      setIsLoading(false);
      return;
    }

    if (!hypothesis?.trim()) {
      setError('Hypothesis is required');
      setIsLoading(false);
      return;
    }

    if (!metricName?.trim() || !metricEventName?.trim()) {
      setError('Primary metric details are required');
      setIsLoading(false);
      return;
    }

    if (totalPercentage !== 100) {
      setError(`Traffic allocation must sum to 100% (currently ${totalPercentage}%)`);
      setIsLoading(false);
      return;
    }

    const controlVariation = variations.find(v => v.isControl);
    if (!controlVariation) {
      setError('One variation must be marked as control');
      setIsLoading(false);
      return;
    }

    try {
      const parsedVariations = variations.map(v => {
        let parsedValue: unknown = v.value;
        try {
          parsedValue = JSON.parse(v.value);
        } catch {
          parsedValue = v.value;
        }
        return {
          key: v.key,
          name: v.name.trim(),
          value: parsedValue,
          isControl: v.isControl,
        };
      });

      const trafficAllocation = variations.map(v => ({
        variationKey: v.key,
        percentage: v.percentage,
      }));

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

      await createExperimentApi(platform, environment, {
        experimentKey: experimentKey.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        hypothesis: hypothesis.trim(),
        variations: parsedVariations,
        controlVariation: controlVariation.key,
        trafficAllocation,
        targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
        primaryMetric: {
          id: metricEventName.trim().toLowerCase().replace(/\s+/g, '_'),
          name: metricName.trim(),
          eventName: metricEventName.trim(),
          metricType,
          successDirection: 'increase',
        },
        confidenceLevel: 0.95,
      });

      router.push(`/platforms/${platform}/environments/${environment}/experiments`);
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
            <h1 className="text-4xl font-black mb-2">Create Experiment</h1>
            <p className="text-muted-foreground">
              {platform && environment
                ? `Add a new A/B/n test for ${platform} / ${environment}`
                : 'Configure and launch a new A/B/n test experiment'}
            </p>
          </div>
          <Link href={`/platforms/${initialPlatform}/environments/${initialEnvironment}/experiments`}>
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
                <Label htmlFor="experimentKey">Experiment Key *</Label>
                <Input
                  id="experimentKey"
                  value={experimentKey}
                  onChange={(e) => setExperimentKey(e.target.value)}
                  placeholder="e.g., checkout-redesign"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Use kebab-case for consistency
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Checkout Redesign Test"
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
                placeholder="Brief description of this experiment"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hypothesis">Hypothesis *</Label>
              <textarea
                id="hypothesis"
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                placeholder="e.g., Single-page checkout will increase conversions by 15%"
                required
                disabled={isLoading}
                className="w-full p-3 border border-black/20 rounded-lg min-h-[100px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Variations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Variations ({variations.length})</CardTitle>
                <Badge
                  variant={totalPercentage === 100 ? 'default' : 'warning'}
                  size="sm"
                >
                  {totalPercentage}% total
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={distributeEvenly}
                  disabled={isLoading}
                >
                  Distribute Evenly
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={addVariation}
                  disabled={isLoading || variations.length >= 6}
                >
                  + Add Variant
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {variations.map((variation, index) => {
              const colors = VARIANT_COLORS[index % VARIANT_COLORS.length];
              const label = getVariationLabel(index, variation.isControl);
              return (
                <div
                  key={`${variation.key}-${index}`}
                  className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{label}</span>
                      {variation.isControl && (
                        <Badge variant="default" size="sm">CONTROL</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!variation.isControl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAsControl(index)}
                          disabled={isLoading}
                        >
                          Set as Control
                        </Button>
                      )}
                      {variations.length > 2 && !variation.isControl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariation(index)}
                          disabled={isLoading}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={variation.name}
                          onChange={(e) => updateVariation(index, { name: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Traffic %</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={variation.percentage}
                            onChange={(e) => updateVariation(index, {
                              percentage: parseInt(e.target.value, 10) || 0
                            })}
                            disabled={isLoading}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Value (JSON or string)</Label>
                      <textarea
                        value={variation.value}
                        onChange={(e) => updateVariation(index, { value: e.target.value })}
                        placeholder='{"version": "v1"} or simple string'
                        disabled={isLoading}
                        className="w-full p-3 border border-black/20 rounded-lg min-h-[100px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {totalPercentage !== 100 && (
              <Alert variant="warning">
                Traffic allocation must sum to 100%. Currently at {totalPercentage}%.
              </Alert>
            )}
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
                  No country targeting configured. Experiment will run for all users.
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
                <p className="text-xs text-muted-foreground">User IDs always included in experiment (comma-separated)</p>
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
                <p className="text-xs text-muted-foreground">User IDs always excluded from experiment (comma-separated)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Metric */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Metric</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="metricName">Metric Name *</Label>
                <Input
                  id="metricName"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="e.g., Purchase Conversion"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metricEventName">Event Name *</Label>
                <Input
                  id="metricEventName"
                  value={metricEventName}
                  onChange={(e) => setMetricEventName(e.target.value)}
                  placeholder="e.g., purchase"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metricType">Metric Type</Label>
              <Select
                id="metricType"
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as typeof metricType)}
                disabled={isLoading}
              >
                <option value="conversion">Conversion (binary event)</option>
                <option value="count">Count (number of events)</option>
                <option value="sum">Sum (total value)</option>
                <option value="average">Average (mean value)</option>
              </Select>
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
          <Link href={`/platforms/${initialPlatform}/environments/${initialEnvironment}/experiments`}>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !platform || !environment || totalPercentage !== 100}>
            {isLoading ? 'Creating...' : 'Create Experiment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
