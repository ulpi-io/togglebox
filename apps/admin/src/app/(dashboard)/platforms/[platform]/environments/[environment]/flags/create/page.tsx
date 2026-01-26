'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Steps,
} from '@togglebox/ui';

interface CreateFlagPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

type FlagType = 'boolean' | 'string' | 'number';

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
  { id: 'values', label: 'Values' },
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

export default function CreateFlagPage({ params }: CreateFlagPageProps) {
  const { platform: initialPlatform, environment: initialEnvironment } = use(params);
  const router = useRouter();

  // Step navigation
  const [currentStep, setCurrentStep] = useState('basic');
  const [leftSteps, setLeftSteps] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

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

  // Targeting
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
      isValid: !!(selectedPlatform && selectedEnvironment && flagKey.trim() && name.trim()),
      errors: [] as string[],
    };
    if (!selectedPlatform) basic.errors.push('Platform is required');
    if (!selectedEnvironment) basic.errors.push('Environment is required');
    if (!flagKey.trim()) basic.errors.push('Flag key is required');
    if (!name.trim()) basic.errors.push('Display name is required');

    const values = {
      isValid: true, // Values always have defaults
      errors: [] as string[],
    };

    const targeting = {
      isValid: includeUsersValidation.invalid.length === 0 && excludeUsersValidation.invalid.length === 0,
      errors: [] as string[],
    };
    if (includeUsersValidation.invalid.length > 0) targeting.errors.push('Invalid user IDs in Force Include');
    if (excludeUsersValidation.invalid.length > 0) targeting.errors.push('Invalid user IDs in Force Exclude');

    return { basic, values, targeting };
  }, [
    selectedPlatform, selectedEnvironment, flagKey, name,
    includeUsersValidation, excludeUsersValidation
  ]);

  // Update completed steps based on validation AND whether user has left the step
  useEffect(() => {
    const newCompleted = new Set<string>();
    if (stepValidation.basic.isValid && leftSteps.includes('basic')) newCompleted.add('basic');
    if (stepValidation.values.isValid && leftSteps.includes('values')) newCompleted.add('values');
    if (stepValidation.targeting.isValid && leftSteps.includes('targeting')) newCompleted.add('targeting');
    setCompletedSteps(newCompleted);
  }, [stepValidation, leftSteps]);

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

  // Navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  function markCurrentStepAsLeft() {
    if (!leftSteps.includes(currentStep)) {
      setLeftSteps(prev => [...prev, currentStep]);
    }
  }

  function goToNextStep() {
    if (currentStepIndex < STEPS.length - 1) {
      markCurrentStepAsLeft();
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  }

  function goToPreviousStep() {
    if (currentStepIndex > 0) {
      markCurrentStepAsLeft();
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  }

  function handleStepClick(stepId: string) {
    if (stepId !== currentStep) {
      markCurrentStepAsLeft();
      setCurrentStep(stepId);
    }
  }

  // Check if all steps are valid for submission
  const canSubmit = stepValidation.basic.isValid &&
    stepValidation.values.isValid &&
    stepValidation.targeting.isValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      if (!stepValidation.basic.isValid) {
        setCurrentStep('basic');
        setError(stepValidation.basic.errors[0]);
      } else if (!stepValidation.values.isValid) {
        setCurrentStep('values');
        setError(stepValidation.values.errors[0]);
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

            {!stepValidation.basic.isValid && stepValidation.basic.errors.length > 0 && (
              <Alert variant="warning">
                <span>Missing required fields: {stepValidation.basic.errors.join(', ')}</span>
              </Alert>
            )}
          </div>
        )}

        {/* Step 2: Values */}
        {currentStep === 'values' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Flag Values</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <p className="text-xs text-muted-foreground">
                      Served when flag conditions are not met
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Served when rollout or targeting applies
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="enabled"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      disabled={isLoading}
                    />
                    <div>
                      <Label htmlFor="enabled" className="cursor-pointer">
                        Enable flag immediately
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When disabled, the flag will serve Value A to all users
                      </p>
                    </div>
                  </div>
                </div>
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
                      No country targeting configured. Flag will apply to all users.
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
                      User IDs always included in flag (comma or newline separated)
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
                      User IDs always excluded from flag (comma or newline separated)
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
            <Link href={`/platforms/${initialPlatform}/environments/${initialEnvironment}/flags`}>
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
                {isLoading ? 'Creating...' : 'Create Flag'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
