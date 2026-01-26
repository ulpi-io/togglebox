'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Steps,
} from '@togglebox/ui';

interface Variation {
  key: string;
  name: string;
  value: string;
  valueType: 'string' | 'json';
  isControl: boolean;
  percentage: number;
}

interface CountryLanguagePair {
  country: string;
  languages: string;
}

interface ValidationResult {
  valid: string[];
  duplicates: string[];
  invalid: string[];
}

const VARIANT_COLORS = [
  { border: 'border-info/50', bg: 'bg-info/10' },
  { border: 'border-success/50', bg: 'bg-success/10' },
  { border: 'border-warning/50', bg: 'bg-warning/10' },
  { border: 'border-destructive/50', bg: 'bg-destructive/10' },
  { border: 'border-purple-500/50', bg: 'bg-purple-50' },
  { border: 'border-pink-500/50', bg: 'bg-pink-50' },
];

const STEPS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'metric', label: 'Metric' },
  { id: 'variations', label: 'Variations' },
  { id: 'targeting', label: 'Targeting' },
];

// Validation helpers
function validateUserList(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: [], duplicates: [], invalid: [] };
  }

  const entries = input
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];

  // Alphanumeric + common ID characters (underscore, dash, dot, @)
  const validPattern = /^[\w\-\.@]+$/;

  for (const entry of entries) {
    if (!validPattern.test(entry)) {
      invalid.push(entry);
    } else if (seen.has(entry.toLowerCase())) {
      duplicates.push(entry);
    } else {
      seen.add(entry.toLowerCase());
      valid.push(entry);
    }
  }

  return { valid, duplicates, invalid };
}

function validateCountryCode(code: string): { valid: boolean; formatted: string } {
  const trimmed = code.trim().toUpperCase();
  const isValid = /^[A-Z]{2}$/.test(trimmed);
  return { valid: isValid || trimmed === '', formatted: trimmed };
}

function validateLanguages(input: string): { valid: string[]; invalid: string[]; duplicates: string[] } {
  if (!input.trim()) {
    return { valid: [], invalid: [], duplicates: [] };
  }

  const entries = input
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];

  // Language codes should be lowercase letters only (2-3 chars)
  const validPattern = /^[a-z]{2,3}$/;

  for (const entry of entries) {
    if (!validPattern.test(entry)) {
      invalid.push(entry);
    } else if (seen.has(entry)) {
      duplicates.push(entry);
    } else {
      seen.add(entry);
      valid.push(entry);
    }
  }

  return { valid, invalid, duplicates };
}

export default function CreateExperimentPage() {
  const router = useRouter();

  // Step navigation
  const [currentStep, setCurrentStep] = useState('basic');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

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

  // Basic fields
  const [experimentKey, setExperimentKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  // Multi-variant support
  const [variations, setVariations] = useState<Variation[]>([
    { key: 'control', name: 'Control', value: '', valueType: 'string', isControl: true, percentage: 50 },
    { key: 'variant_1', name: 'Variant 1', value: '', valueType: 'string', isControl: false, percentage: 50 },
  ]);
  const [jsonErrors, setJsonErrors] = useState<Record<number, string>>({});

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

  // Validation results for targeting
  const includeUsersValidation = useMemo(() => validateUserList(forceIncludeUsers), [forceIncludeUsers]);
  const excludeUsersValidation = useMemo(() => validateUserList(forceExcludeUsers), [forceExcludeUsers]);

  // Step validation
  const stepValidation = useMemo(() => {
    const basic = {
      isValid: !!(selectedPlatform && selectedEnvironment && experimentKey.trim() && name.trim() && hypothesis.trim()),
      errors: [] as string[],
    };
    if (!selectedPlatform) basic.errors.push('Platform is required');
    if (!selectedEnvironment) basic.errors.push('Environment is required');
    if (!experimentKey.trim()) basic.errors.push('Experiment key is required');
    if (!name.trim()) basic.errors.push('Display name is required');
    if (!hypothesis.trim()) basic.errors.push('Hypothesis is required');

    const metric = {
      isValid: !!(metricName.trim() && metricEventName.trim()),
      errors: [] as string[],
    };
    if (!metricName.trim()) metric.errors.push('Metric name is required');
    if (!metricEventName.trim()) metric.errors.push('Event name is required');

    const variationsValid = {
      isValid: totalPercentage === 100 && variations.some(v => v.isControl) && Object.keys(jsonErrors).length === 0,
      errors: [] as string[],
    };
    if (totalPercentage !== 100) variationsValid.errors.push(`Traffic must sum to 100% (currently ${totalPercentage}%)`);
    if (!variations.some(v => v.isControl)) variationsValid.errors.push('One variation must be marked as control');
    if (Object.keys(jsonErrors).length > 0) variationsValid.errors.push('Fix JSON validation errors');

    const targeting = {
      isValid: includeUsersValidation.invalid.length === 0 && excludeUsersValidation.invalid.length === 0,
      errors: [] as string[],
    };
    if (includeUsersValidation.invalid.length > 0) targeting.errors.push('Invalid user IDs in Force Include');
    if (excludeUsersValidation.invalid.length > 0) targeting.errors.push('Invalid user IDs in Force Exclude');

    return { basic, metric, variations: variationsValid, targeting };
  }, [
    selectedPlatform, selectedEnvironment, experimentKey, name, hypothesis,
    metricName, metricEventName,
    totalPercentage, variations, jsonErrors,
    includeUsersValidation, excludeUsersValidation
  ]);

  // Remove completed status if step validation fails (e.g., user clears required field)
  useEffect(() => {
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev);
      // Remove steps that are no longer valid
      if (!stepValidation.basic.isValid) newCompleted.delete('basic');
      if (!stepValidation.metric.isValid) newCompleted.delete('metric');
      if (!stepValidation.variations.isValid) newCompleted.delete('variations');
      if (!stepValidation.targeting.isValid) newCompleted.delete('targeting');
      // Only update if there's a change
      if (newCompleted.size !== prev.size) return newCompleted;
      for (const item of prev) {
        if (!newCompleted.has(item)) return newCompleted;
      }
      return prev;
    });
  }, [stepValidation]);

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

  function updateVariationValue(index: number, value: string, valueType: 'string' | 'json') {
    updateVariation(index, { value });

    if (valueType === 'json' && value.trim()) {
      try {
        JSON.parse(value);
        setJsonErrors(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Invalid JSON';
        setJsonErrors(prev => ({ ...prev, [index]: message }));
      }
    } else {
      setJsonErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  }

  function handleValueTypeChange(index: number, newType: 'string' | 'json') {
    const variation = variations[index];
    updateVariation(index, { valueType: newType });

    if (newType === 'json' && variation.value.trim()) {
      try {
        JSON.parse(variation.value);
        setJsonErrors(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Invalid JSON';
        setJsonErrors(prev => ({ ...prev, [index]: message }));
      }
    } else {
      setJsonErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
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
      { key: newKey, name: newName, value: '', valueType: 'string', isControl: false, percentage: evenPercentage },
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

  // Navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  function markCurrentStepAsCompleted() {
    // Only mark step as completed if validation passes
    const stepId = currentStep;
    const validation = stepValidation[stepId as keyof typeof stepValidation];
    if (validation?.isValid && !completedSteps.has(stepId)) {
      setCompletedSteps(prev => new Set([...prev, stepId]));
    }
  }

  function goToNextStep() {
    if (currentStepIndex < STEPS.length - 1) {
      // Only mark as completed when moving FORWARD (not when going back)
      markCurrentStepAsCompleted();
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  }

  function goToPreviousStep() {
    if (currentStepIndex > 0) {
      // Don't mark as completed when going back - user hasn't "finished" the step
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  }

  function handleStepClick(stepId: string) {
    if (stepId !== currentStep) {
      const targetIndex = STEPS.findIndex(s => s.id === stepId);
      // Only mark as completed if navigating forward
      if (targetIndex > currentStepIndex) {
        markCurrentStepAsCompleted();
      }
      setCurrentStep(stepId);
    }
  }

  // Check if all steps are valid for submission
  const canSubmit = stepValidation.basic.isValid &&
    stepValidation.metric.isValid &&
    stepValidation.variations.isValid &&
    stepValidation.targeting.isValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      // Find first invalid step and navigate to it
      if (!stepValidation.basic.isValid) {
        setCurrentStep('basic');
        setError(stepValidation.basic.errors[0]);
      } else if (!stepValidation.metric.isValid) {
        setCurrentStep('metric');
        setError(stepValidation.metric.errors[0]);
      } else if (!stepValidation.variations.isValid) {
        setCurrentStep('variations');
        setError(stepValidation.variations.errors[0]);
      } else if (!stepValidation.targeting.isValid) {
        setCurrentStep('targeting');
        setError(stepValidation.targeting.errors[0]);
      }
      return;
    }

    setIsLoading(true);

    try {
      const parsedVariations = variations.map(v => {
        let parsedValue: unknown = v.value;
        if (v.valueType === 'json' && v.value.trim()) {
          try {
            parsedValue = JSON.parse(v.value);
          } catch {
            parsedValue = v.value;
          }
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

      // Use validated user lists
      if (includeUsersValidation.valid.length > 0) {
        targeting.forceIncludeUsers = includeUsersValidation.valid;
      }
      if (excludeUsersValidation.valid.length > 0) {
        targeting.forceExcludeUsers = excludeUsersValidation.valid;
      }

      const controlVariation = variations.find(v => v.isControl);

      await createExperimentApi(platform, environment, {
        experimentKey: experimentKey.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        hypothesis: hypothesis.trim(),
        variations: parsedVariations,
        controlVariation: controlVariation!.key,
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

      router.push(`/experiments?platform=${platform}&environment=${environment}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  // Render validation feedback for user lists
  function renderUserListValidation(validation: ValidationResult, label: string) {
    const hasIssues = validation.duplicates.length > 0 || validation.invalid.length > 0;
    if (!hasIssues && validation.valid.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {validation.valid.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {validation.valid.length} valid {validation.valid.length === 1 ? 'user' : 'users'}
          </p>
        )}
        {validation.duplicates.length > 0 && (
          <p className="text-xs text-warning">
            {validation.duplicates.length} duplicate{validation.duplicates.length === 1 ? '' : 's'} will be ignored: {validation.duplicates.slice(0, 3).join(', ')}{validation.duplicates.length > 3 ? '...' : ''}
          </p>
        )}
        {validation.invalid.length > 0 && (
          <p className="text-xs text-destructive">
            {validation.invalid.length} invalid format: {validation.invalid.slice(0, 3).join(', ')}{validation.invalid.length > 3 ? '...' : ''}
          </p>
        )}
      </div>
    );
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
          <Link href="/experiments">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <Steps
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
        />
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Info */}
        {currentStep === 'basic' && (
          <div className="space-y-6">
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

            {!stepValidation.basic.isValid && stepValidation.basic.errors.length > 0 && (
              <Alert variant="warning">
                <span>Missing required fields: {stepValidation.basic.errors.join(', ')}</span>
              </Alert>
            )}
          </div>
        )}

        {/* Step 2: Metric */}
        {currentStep === 'metric' && (
          <div className="space-y-6">
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
                    <p className="text-xs text-muted-foreground">
                      Track this event from your app using the SDK:
                    </p>
                    <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
{`// JavaScript/TypeScript
await client.trackConversion('${experimentKey || 'experiment-key'}', context, {
  metricName: '${metricEventName || 'purchase'}',
  value: 99.99  // optional
});`}
                    </pre>
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

            {!stepValidation.metric.isValid && stepValidation.metric.errors.length > 0 && (
              <Alert variant="warning">
                <span>Missing required fields: {stepValidation.metric.errors.join(', ')}</span>
              </Alert>
            )}
          </div>
        )}

        {/* Step 3: Variations */}
        {currentStep === 'variations' && (
          <div className="space-y-6">
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
                          <div className="flex items-center justify-between">
                            <Label>Value</Label>
                            <Select
                              value={variation.valueType}
                              onChange={(e) => handleValueTypeChange(index, e.target.value as 'string' | 'json')}
                              disabled={isLoading}
                              className="w-24 h-8 text-xs"
                            >
                              <option value="string">String</option>
                              <option value="json">JSON</option>
                            </Select>
                          </div>
                          <textarea
                            value={variation.value}
                            onChange={(e) => updateVariationValue(index, e.target.value, variation.valueType)}
                            placeholder={variation.valueType === 'json' ? '{"version": "v1", "enabled": true}' : 'simple string value'}
                            disabled={isLoading}
                            className={`w-full p-3 border rounded-lg min-h-[100px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200 font-mono ${
                              jsonErrors[index] ? 'border-destructive' : 'border-black/20'
                            }`}
                          />
                          {jsonErrors[index] && (
                            <p className="text-xs text-destructive">{jsonErrors[index]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {totalPercentage !== 100 && (
                  <Alert variant="warning">
                    <span>Traffic allocation must sum to 100%. Currently at {totalPercentage}%.</span>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Targeting */}
        {currentStep === 'targeting' && (
          <div className="space-y-6">
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
                      {countryLanguagePairs.map((pair, index) => {
                        const countryValidation = validateCountryCode(pair.country);
                        const langValidation = validateLanguages(pair.languages);
                        const hasCountryError = pair.country.trim() && !countryValidation.valid;
                        const hasLangError = langValidation.invalid.length > 0;

                        return (
                          <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Country Code (2-letter ISO)</Label>
                                  <Input
                                    value={pair.country}
                                    onChange={(e) => updateCountryLanguagePair(index, { country: e.target.value.toUpperCase() })}
                                    placeholder="e.g., AE"
                                    disabled={isLoading}
                                    className={`uppercase ${hasCountryError ? 'border-destructive' : ''}`}
                                    maxLength={2}
                                  />
                                  {hasCountryError && (
                                    <p className="text-xs text-destructive">Must be 2 uppercase letters</p>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Languages (comma-separated)</Label>
                                  <Input
                                    value={pair.languages}
                                    onChange={(e) => updateCountryLanguagePair(index, { languages: e.target.value })}
                                    placeholder="e.g., en, ar"
                                    disabled={isLoading}
                                    className={hasLangError ? 'border-destructive' : ''}
                                  />
                                  {langValidation.valid.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {langValidation.valid.length} language{langValidation.valid.length === 1 ? '' : 's'}: {langValidation.valid.join(', ')}
                                    </p>
                                  )}
                                  {langValidation.duplicates.length > 0 && (
                                    <p className="text-xs text-warning">
                                      Duplicates ignored: {langValidation.duplicates.join(', ')}
                                    </p>
                                  )}
                                  {langValidation.invalid.length > 0 && (
                                    <p className="text-xs text-destructive">
                                      Invalid: {langValidation.invalid.join(', ')} (must be 2-3 lowercase letters)
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCountryLanguagePair(index)}
                                disabled={isLoading}
                                className="text-destructive hover:text-destructive mt-5"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground">
                        Each country can have multiple languages. Leave languages empty for all languages in that country.
                      </p>
                    </div>
                  )}
                </div>

                {/* Force Include/Exclude Users */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forceIncludeUsers">Force Include Users</Label>
                    <textarea
                      id="forceIncludeUsers"
                      value={forceIncludeUsers}
                      onChange={(e) => setForceIncludeUsers(e.target.value)}
                      placeholder="user123, user456, user789"
                      className={`w-full p-3 border rounded-lg min-h-[80px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200 resize-y ${
                        includeUsersValidation.invalid.length > 0 ? 'border-destructive' : 'border-black/20'
                      }`}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      User IDs always included in experiment (comma or newline separated)
                    </p>
                    {renderUserListValidation(includeUsersValidation, 'include')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forceExcludeUsers">Force Exclude Users</Label>
                    <textarea
                      id="forceExcludeUsers"
                      value={forceExcludeUsers}
                      onChange={(e) => setForceExcludeUsers(e.target.value)}
                      placeholder="user789, user012"
                      className={`w-full p-3 border rounded-lg min-h-[80px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200 resize-y ${
                        excludeUsersValidation.invalid.length > 0 ? 'border-destructive' : 'border-black/20'
                      }`}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      User IDs always excluded from experiment (comma or newline separated)
                    </p>
                    {renderUserListValidation(excludeUsersValidation, 'exclude')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <span>{error}</span>
          </Alert>
        )}

        {/* Navigation & Actions */}
        <div className="flex items-center justify-between pt-6 border-t mt-6">
          <div>
            {currentStepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isLoading}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/experiments">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
            {currentStepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={isLoading}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading || !canSubmit}
              >
                {isLoading ? 'Creating...' : 'Create Experiment'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
