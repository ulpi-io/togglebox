'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { getExperimentApi, updateExperimentApi } from '@/lib/api/experiments';
import type { Experiment, TrafficAllocation } from '@/lib/api/types';
import {
  Button,
  Input,
  Label,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Steps,
} from '@togglebox/ui';

interface EditExperimentPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    experimentKey: string;
  }>;
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

const STEPS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'traffic', label: 'Traffic' },
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

export default function EditExperimentPage({ params }: EditExperimentPageProps) {
  const { platform, environment, experimentKey } = use(params);
  const router = useRouter();

  // Step navigation
  const [currentStep, setCurrentStep] = useState('basic');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [isLoadingExperiment, setIsLoadingExperiment] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields - Basic
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  // Form fields - Traffic Allocation
  const [trafficAllocation, setTrafficAllocation] = useState<TrafficAllocation[]>([]);

  // Form fields - Targeting
  const [countryLanguagePairs, setCountryLanguagePairs] = useState<CountryLanguagePair[]>([]);
  const [forceIncludeUsers, setForceIncludeUsers] = useState('');
  const [forceExcludeUsers, setForceExcludeUsers] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation results for targeting
  const includeUsersValidation = useMemo(() => validateUserList(forceIncludeUsers), [forceIncludeUsers]);
  const excludeUsersValidation = useMemo(() => validateUserList(forceExcludeUsers), [forceExcludeUsers]);

  // Step validation
  const stepValidation = useMemo(() => {
    const basic = {
      isValid: !!name.trim() && !!hypothesis.trim(),
      errors: [] as string[],
    };
    if (!name.trim()) basic.errors.push('Display name is required');
    if (!hypothesis.trim()) basic.errors.push('Hypothesis is required');

    const traffic = {
      isValid: trafficAllocation.reduce((sum, t) => sum + t.percentage, 0) === 100,
      errors: [] as string[],
    };
    const totalPercentage = trafficAllocation.reduce((sum, t) => sum + t.percentage, 0);
    if (totalPercentage !== 100) {
      traffic.errors.push(`Traffic allocation must sum to 100% (currently ${totalPercentage}%)`);
    }

    const targeting = {
      isValid: includeUsersValidation.invalid.length === 0 && excludeUsersValidation.invalid.length === 0,
      errors: [] as string[],
    };
    if (includeUsersValidation.invalid.length > 0) targeting.errors.push('Invalid user IDs in Force Include');
    if (excludeUsersValidation.invalid.length > 0) targeting.errors.push('Invalid user IDs in Force Exclude');

    return { basic, traffic, targeting };
  }, [name, hypothesis, trafficAllocation, includeUsersValidation, excludeUsersValidation]);

  // Remove completed status if step validation fails
  useEffect(() => {
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev);
      if (!stepValidation.basic.isValid) newCompleted.delete('basic');
      if (!stepValidation.traffic.isValid) newCompleted.delete('traffic');
      if (!stepValidation.targeting.isValid) newCompleted.delete('targeting');
      if (newCompleted.size !== prev.size) return newCompleted;
      for (const item of prev) {
        if (!newCompleted.has(item)) return newCompleted;
      }
      return prev;
    });
  }, [stepValidation]);

  const loadExperiment = useCallback(async () => {
    try {
      setIsLoadingExperiment(true);
      const data = await getExperimentApi(platform, environment, experimentKey);
      setExperiment(data);
      setName(data.name);
      setDescription(data.description || '');
      setHypothesis(data.hypothesis);
      setTrafficAllocation(data.trafficAllocation || []);

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
      setLoadError(err instanceof Error ? err.message : 'Failed to load experiment');
    } finally {
      setIsLoadingExperiment(false);
    }
  }, [platform, environment, experimentKey]);

  useEffect(() => {
    loadExperiment();
  }, [loadExperiment]);

  // Navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  function markCurrentStepAsCompleted() {
    const stepId = currentStep;
    const validation = stepValidation[stepId as keyof typeof stepValidation];
    if (validation?.isValid && !completedSteps.has(stepId)) {
      setCompletedSteps(prev => new Set([...prev, stepId]));
    }
  }

  function goToNextStep() {
    if (currentStepIndex < STEPS.length - 1) {
      markCurrentStepAsCompleted();
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  }

  function goToPreviousStep() {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  }

  function handleStepClick(stepId: string) {
    if (stepId !== currentStep) {
      const targetIndex = STEPS.findIndex(s => s.id === stepId);
      if (targetIndex > currentStepIndex) {
        markCurrentStepAsCompleted();
      }
      setCurrentStep(stepId);
    }
  }

  // Traffic allocation helpers
  function updateTrafficPercentage(variationKey: string, newPercentage: number) {
    setTrafficAllocation(prev =>
      prev.map(t =>
        t.variationKey === variationKey ? { ...t, percentage: newPercentage } : t
      )
    );
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

  // Check if all steps are valid for submission
  const canSubmit = stepValidation.basic.isValid &&
    stepValidation.traffic.isValid &&
    stepValidation.targeting.isValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      if (!stepValidation.basic.isValid) {
        setCurrentStep('basic');
        setError(stepValidation.basic.errors[0]);
      } else if (!stepValidation.traffic.isValid) {
        setCurrentStep('traffic');
        setError(stepValidation.traffic.errors[0]);
      } else if (!stepValidation.targeting.isValid) {
        setCurrentStep('targeting');
        setError(stepValidation.targeting.errors[0]);
      }
      return;
    }

    setIsLoading(true);

    try {
      // Build targeting object
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

      await updateExperimentApi(platform, environment, experimentKey, {
        name: name.trim(),
        description: description.trim() || undefined,
        hypothesis: hypothesis.trim(),
        trafficAllocation,
        targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
      });

      router.push(`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  // Render validation feedback for user lists
  function renderUserListValidation(validation: ValidationResult) {
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

  if (isLoadingExperiment) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Experiment</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !experiment) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Experiment</h1>
          <p className="text-muted-foreground">{platform} / {environment}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading experiment
            </div>
            <p className="text-muted-foreground mb-4">{loadError || 'Experiment not found'}</p>
            <Link href={`/experiments?platform=${platform}&environment=${environment}`}>
              <Button variant="outline">Back to Experiments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only allow editing draft experiments
  if (experiment.status !== 'draft') {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Experiment</h1>
          <p className="text-muted-foreground">{platform} / {environment}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-warning text-lg font-bold mb-2">
              Cannot Edit Experiment
            </div>
            <p className="text-muted-foreground mb-4">
              Only draft experiments can be edited. This experiment is currently &ldquo;{experiment.status}&rdquo;.
            </p>
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`}>
              <Button variant="outline">Back to Experiment</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPercentage = trafficAllocation.reduce((sum, t) => sum + t.percentage, 0);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black">Edit Experiment</h1>
              <Badge variant="secondary">{experiment.status}</Badge>
            </div>
            <p className="text-muted-foreground">
              {platform} / {environment} / {experimentKey}
            </p>
          </div>
          <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`}>
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
            <Card>
              <CardHeader>
                <CardTitle>Experiment Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Experiment Key (immutable)</Label>
                  <Input value={experiment.experimentKey} disabled className="bg-muted" />
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

        {/* Step 2: Traffic Allocation */}
        {currentStep === 'traffic' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Variations (Read-only)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Variations cannot be changed after creation. You can adjust the traffic allocation below.
                </p>
                <div className="space-y-2">
                  {experiment.variations.map((variation) => (
                    <div key={variation.key} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{variation.name}</span>
                          {variation.isControl && (
                            <Badge variant="secondary" className="text-xs">Control</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">Key: {variation.key}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Value: {JSON.stringify(variation.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Distribute traffic between variations. Total must equal 100%.
                </p>

                <div className="space-y-4">
                  {trafficAllocation.map((allocation) => {
                    const variation = experiment.variations.find(v => v.key === allocation.variationKey);
                    return (
                      <div key={allocation.variationKey} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            {variation?.name || allocation.variationKey}
                            {variation?.isControl && (
                              <Badge variant="secondary" className="text-xs">Control</Badge>
                            )}
                          </Label>
                          <span className="text-sm font-medium">{allocation.percentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={allocation.percentage}
                          onChange={(e) => updateTrafficPercentage(allocation.variationKey, parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          disabled={isLoading}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Visual bar */}
                <div className="h-6 rounded-full overflow-hidden flex">
                  {trafficAllocation.map((allocation, index) => {
                    const colors = ['bg-primary', 'bg-blue-400', 'bg-green-400', 'bg-orange-400', 'bg-purple-400'];
                    return (
                      <div
                        key={allocation.variationKey}
                        className={`${colors[index % colors.length]} transition-all duration-200 flex items-center justify-center text-xs text-white font-medium`}
                        style={{ width: `${allocation.percentage}%` }}
                      >
                        {allocation.percentage > 10 && `${allocation.percentage}%`}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Total:</span>
                  <span className={`text-sm font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-destructive'}`}>
                    {totalPercentage}%
                  </span>
                </div>

                {totalPercentage !== 100 && (
                  <Alert variant="warning">
                    <span>Traffic allocation must equal 100%. Currently at {totalPercentage}%.</span>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Targeting */}
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
                      No country targeting configured. Experiment will apply to all users.
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
                    {renderUserListValidation(includeUsersValidation)}
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
                    {renderUserListValidation(excludeUsersValidation)}
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
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`}>
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
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
