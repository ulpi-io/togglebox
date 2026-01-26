'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CreateFlagPage() {
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
      isValid: true,
      errors: [] as string[],
    };

    const targeting = {
      isValid: includeUsersValidation.invalid.length === 0 && excludeUsersValidation.invalid.length === 0,
      errors: [] as string[],
    };
    if (includeUsersValidation.invalid.length > 0) {
      targeting.errors.push(`Invalid include users: ${includeUsersValidation.invalid.join(', ')}`);
    }
    if (excludeUsersValidation.invalid.length > 0) {
      targeting.errors.push(`Invalid exclude users: ${excludeUsersValidation.invalid.join(', ')}`);
    }

    return { basic, values, targeting };
  }, [selectedPlatform, selectedEnvironment, flagKey, name, includeUsersValidation, excludeUsersValidation]);

  const canProceed = (step: string) => {
    if (step === 'basic') return stepValidation.basic.isValid;
    if (step === 'values') return stepValidation.values.isValid;
    if (step === 'targeting') return stepValidation.targeting.isValid;
    return false;
  };

  const allStepsValid = stepValidation.basic.isValid && stepValidation.values.isValid && stepValidation.targeting.isValid;

  const handleStepClick = (stepId: string) => {
    const stepIndex = STEPS.findIndex(s => s.id === stepId);
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);

    if (stepIndex < currentIndex) {
      setCurrentStep(stepId);
    } else if (stepIndex === currentIndex + 1 && canProceed(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(stepId);
    }
  };

  const handleNext = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1 && canProceed(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const parseValue = (val: string, type: FlagType): string | number | boolean => {
    if (type === 'boolean') return val === 'true';
    if (type === 'number') return Number(val) || 0;
    return val;
  };

  const handleCountryChange = (index: number, country: string) => {
    const { formatted } = validateCountryCode(country);
    setCountryLanguagePairs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], country: formatted };
      return updated;
    });
  };

  const handleLanguagesChange = (index: number, languages: string) => {
    setCountryLanguagePairs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], languages };
      return updated;
    });
  };

  const addCountryLanguagePair = () => {
    setCountryLanguagePairs(prev => [...prev, { country: '', languages: '' }]);
  };

  const removeCountryLanguagePair = (index: number) => {
    setCountryLanguagePairs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allStepsValid || !platform || !environment) return;

    setIsLoading(true);
    setError(null);

    const validCountries = countryLanguagePairs
      .filter(pair => {
        const { valid } = validateCountryCode(pair.country);
        return valid && pair.country.trim();
      })
      .map(pair => {
        const { valid: validLangs } = validateLanguages(pair.languages);
        return {
          country: pair.country.trim().toUpperCase(),
          languages: validLangs.length > 0 ? validLangs.map(l => ({ language: l })) : undefined,
        };
      });

    try {
      await createFlagApi(platform, environment, {
        flagKey: flagKey.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        flagType,
        enabled,
        valueA: parseValue(valueA, flagType),
        valueB: parseValue(valueB, flagType),
        targeting: {
          countries: validCountries.length > 0 ? validCountries : undefined,
          forceIncludeUsers: includeUsersValidation.valid.length > 0 ? includeUsersValidation.valid : undefined,
          forceExcludeUsers: excludeUsersValidation.valid.length > 0 ? excludeUsersValidation.valid : undefined,
        },
      });
      router.push(`/platforms/${platform}/environments/${environment}/flags`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flag');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/flags"
          className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block"
        >
          ← Back to flags
        </Link>
        <h1 className="text-4xl font-black mb-2">Create Feature Flag</h1>
        <p className="text-muted-foreground">
          Create a new 2-value feature flag with targeting rules
        </p>
      </div>

      <Steps
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        className="mb-8"
      />

      <Card>
        <CardHeader>
          <CardTitle>{STEPS.find(s => s.id === currentStep)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">{error}</Alert>
            )}

            {currentStep === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platform">Platform *</Label>
                    <Select
                      id="platform"
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      disabled={loadingPlatforms}
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
                  <div>
                    <Label htmlFor="environment">Environment *</Label>
                    <Select
                      id="environment"
                      value={selectedEnvironment}
                      onChange={(e) => setSelectedEnvironment(e.target.value)}
                      disabled={!selectedPlatform || loadingEnvironments}
                    >
                      <option value="">
                        {loadingEnvironments ? 'Loading...' : 'Select environment'}
                      </option>
                      {environments.map((e) => (
                        <option key={e.environment} value={e.environment}>
                          {e.environment}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="flagKey">Flag Key *</Label>
                  <Input
                    id="flagKey"
                    value={flagKey}
                    onChange={(e) => setFlagKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="e.g., new-checkout-flow"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique identifier. Only letters, numbers, hyphens, underscores.
                  </p>
                </div>

                <div>
                  <Label htmlFor="name">Display Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., New Checkout Flow"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this flag control?"
                  />
                </div>

                <div>
                  <Label htmlFor="flagType">Value Type</Label>
                  <Select
                    id="flagType"
                    value={flagType}
                    onChange={(e) => {
                      const newType = e.target.value as FlagType;
                      setFlagType(newType);
                      if (newType === 'boolean') {
                        setValueA('true');
                        setValueB('false');
                      } else if (newType === 'number') {
                        setValueA('1');
                        setValueB('0');
                      } else {
                        setValueA('variant-a');
                        setValueB('variant-b');
                      }
                    }}
                  >
                    <option value="boolean">Boolean (true/false)</option>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 'values' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valueA">
                      Value A {flagType === 'boolean' && '(when enabled)'}
                    </Label>
                    {flagType === 'boolean' ? (
                      <Select
                        id="valueA"
                        value={valueA}
                        onChange={(e) => setValueA(e.target.value)}
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
                        className="font-mono"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Served when flag is ON
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="valueB">
                      Value B {flagType === 'boolean' && '(when disabled)'}
                    </Label>
                    {flagType === 'boolean' ? (
                      <Select
                        id="valueB"
                        value={valueB}
                        onChange={(e) => setValueB(e.target.value)}
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
                        className="font-mono"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Served when flag is OFF
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="enabled"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    <Label htmlFor="enabled" className="font-normal cursor-pointer">
                      Enable flag immediately after creation
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    When enabled, matching users will receive Value A
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'targeting' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Country + Language Targeting</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCountryLanguagePair}
                    >
                      Add Country
                    </Button>
                  </div>
                  {countryLanguagePairs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
                      No country targeting. Flag will apply to all countries.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {countryLanguagePairs.map((pair, index) => {
                        const countryValidation = validateCountryCode(pair.country);
                        const langValidation = validateLanguages(pair.languages);
                        return (
                          <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <Input
                                value={pair.country}
                                onChange={(e) => handleCountryChange(index, e.target.value)}
                                placeholder="US"
                                maxLength={2}
                                className={`font-mono uppercase ${
                                  pair.country && !countryValidation.valid ? 'border-destructive' : ''
                                }`}
                              />
                              {pair.country && !countryValidation.valid && (
                                <p className="text-xs text-destructive mt-1">Invalid country code</p>
                              )}
                            </div>
                            <div className="flex-[2]">
                              <Input
                                value={pair.languages}
                                onChange={(e) => handleLanguagesChange(index, e.target.value)}
                                placeholder="en, es, fr (optional)"
                                className={langValidation.invalid.length > 0 ? 'border-destructive' : ''}
                              />
                              {langValidation.invalid.length > 0 && (
                                <p className="text-xs text-destructive mt-1">
                                  Invalid: {langValidation.invalid.join(', ')}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCountryLanguagePair(index)}
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="forceIncludeUsers">Force Include Users</Label>
                  <textarea
                    id="forceIncludeUsers"
                    value={forceIncludeUsers}
                    onChange={(e) => setForceIncludeUsers(e.target.value)}
                    placeholder="user-id-1, user-id-2 (comma or newline separated)"
                    className="w-full p-3 border-2 border-black/10 rounded-lg font-mono text-sm min-h-[80px] focus:outline-none focus:border-black/30"
                  />
                  {includeUsersValidation.valid.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {includeUsersValidation.valid.length} valid user(s)
                    </p>
                  )}
                  {includeUsersValidation.duplicates.length > 0 && (
                    <p className="text-xs text-warning mt-1">
                      Duplicates ignored: {includeUsersValidation.duplicates.join(', ')}
                    </p>
                  )}
                  {includeUsersValidation.invalid.length > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Invalid: {includeUsersValidation.invalid.join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="forceExcludeUsers">Force Exclude Users</Label>
                  <textarea
                    id="forceExcludeUsers"
                    value={forceExcludeUsers}
                    onChange={(e) => setForceExcludeUsers(e.target.value)}
                    placeholder="user-id-1, user-id-2 (comma or newline separated)"
                    className="w-full p-3 border-2 border-black/10 rounded-lg font-mono text-sm min-h-[80px] focus:outline-none focus:border-black/30"
                  />
                  {excludeUsersValidation.valid.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {excludeUsersValidation.valid.length} valid user(s)
                    </p>
                  )}
                  {excludeUsersValidation.duplicates.length > 0 && (
                    <p className="text-xs text-warning mt-1">
                      Duplicates ignored: {excludeUsersValidation.duplicates.join(', ')}
                    </p>
                  )}
                  {excludeUsersValidation.invalid.length > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Invalid: {excludeUsersValidation.invalid.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                Back
              </Button>
              <div className="flex gap-2">
                {!isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed(currentStep)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading || !allStepsValid}
                  >
                    {isLoading ? 'Creating...' : 'Create Flag'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
