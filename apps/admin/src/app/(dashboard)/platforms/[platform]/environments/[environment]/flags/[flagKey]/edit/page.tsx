"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import {
  getFlagApi,
  updateFlagApi,
  updateFlagRolloutApi,
} from "@/lib/api/flags";
import type { Flag } from "@/lib/api/types";
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
} from "@togglebox/ui";

interface EditFlagPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    flagKey: string;
  }>;
}

type FlagType = "boolean" | "string" | "number";

interface CountryLanguagePair {
  id: string;
  country: string;
  languages: string;
  serveValue: "A" | "B";
}

interface ValidationResult {
  valid: string[];
  duplicates: string[];
  invalid: string[];
}

const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "values", label: "Values" },
  { id: "targeting", label: "Targeting" },
];

// Validation helpers
function validateUserList(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: [], duplicates: [], invalid: [] };
  }

  const entries = input
    .split(/[,\n]/)
    .map((s) => s.trim())
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

function validateCountryCode(code: string): {
  valid: boolean;
  formatted: string;
} {
  const trimmed = code.trim().toUpperCase();
  const isValid = /^[A-Z]{2}$/.test(trimmed);
  return { valid: isValid || trimmed === "", formatted: trimmed };
}

function validateLanguages(input: string): {
  valid: string[];
  invalid: string[];
  duplicates: string[];
} {
  if (!input.trim()) {
    return { valid: [], invalid: [], duplicates: [] };
  }

  const entries = input
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];

  // Backend requires exactly 2 letters (ISO 639-1)
  const validPattern = /^[a-z]{2}$/;

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

export default function EditFlagPage({ params }: EditFlagPageProps) {
  const { platform, environment, flagKey } = use(params);
  const router = useRouter();

  // Step navigation
  const [currentStep, setCurrentStep] = useState("basic");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const [flag, setFlag] = useState<Flag | null>(null);
  const [isLoadingFlag, setIsLoadingFlag] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [flagType, setFlagType] = useState<FlagType>("boolean");
  const [valueA, setValueA] = useState<string>("true");
  const [valueB, setValueB] = useState<string>("false");

  // Rollout settings (percentage-based rollouts)
  const [rolloutEnabled, setRolloutEnabled] = useState(false);
  const [rolloutPercentageA, setRolloutPercentageA] = useState(50);
  const [rolloutPercentageB, setRolloutPercentageB] = useState(50);
  const [rolloutSaving, setRolloutSaving] = useState(false);
  const [rolloutError, setRolloutError] = useState<string | null>(null);
  const [rolloutSuccess, setRolloutSuccess] = useState(false);

  // Targeting - Country/Language Pairs
  const [countryLanguagePairs, setCountryLanguagePairs] = useState<
    CountryLanguagePair[]
  >([]);
  const [forceIncludeUsers, setForceIncludeUsers] = useState("");
  const [forceExcludeUsers, setForceExcludeUsers] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation results for targeting
  const includeUsersValidation = useMemo(
    () => validateUserList(forceIncludeUsers),
    [forceIncludeUsers],
  );
  const excludeUsersValidation = useMemo(
    () => validateUserList(forceExcludeUsers),
    [forceExcludeUsers],
  );

  // Step validation
  const stepValidation = useMemo(() => {
    const basic = {
      isValid: !!name.trim(),
      errors: [] as string[],
    };
    if (!name.trim()) basic.errors.push("Display name is required");

    const values = {
      isValid: true, // Values always have defaults
      errors: [] as string[],
    };

    const targeting = {
      isValid:
        includeUsersValidation.invalid.length === 0 &&
        excludeUsersValidation.invalid.length === 0,
      errors: [] as string[],
    };
    if (includeUsersValidation.invalid.length > 0)
      targeting.errors.push("Invalid user IDs in Force Include");
    if (excludeUsersValidation.invalid.length > 0)
      targeting.errors.push("Invalid user IDs in Force Exclude");

    return { basic, values, targeting };
  }, [name, includeUsersValidation, excludeUsersValidation]);

  // Remove completed status if step validation fails
  useEffect(() => {
    setCompletedSteps((prev) => {
      const newCompleted = new Set(prev);
      if (!stepValidation.basic.isValid) newCompleted.delete("basic");
      if (!stepValidation.values.isValid) newCompleted.delete("values");
      if (!stepValidation.targeting.isValid) newCompleted.delete("targeting");
      if (newCompleted.size !== prev.size) return newCompleted;
      for (const item of prev) {
        if (!newCompleted.has(item)) return newCompleted;
      }
      return prev;
    });
  }, [stepValidation]);

  const loadFlag = useCallback(async () => {
    try {
      setIsLoadingFlag(true);
      const data = await getFlagApi(platform, environment, flagKey);
      setFlag(data);
      setName(data.name);
      setDescription(data.description || "");
      setEnabled(data.enabled);
      setFlagType(data.flagType || "boolean");
      setValueA(String(data.valueA));
      setValueB(String(data.valueB));

      // Load rollout settings - use schema defaults (100/0) not 50/50
      setRolloutEnabled(data.rolloutEnabled || false);
      setRolloutPercentageA(data.rolloutPercentageA ?? 100);
      setRolloutPercentageB(data.rolloutPercentageB ?? 0);

      // Convert API targeting format to UI format, preserving serveValue
      if (data.targeting?.countries?.length) {
        setCountryLanguagePairs(
          data.targeting.countries.map((c) => ({
            id: crypto.randomUUID(),
            country: c.country,
            languages: c.languages?.map((l) => l.language).join(", ") || "",
            serveValue: c.serveValue || "A",
          })),
        );
      } else {
        setCountryLanguagePairs([]);
      }
      setForceIncludeUsers(data.targeting?.forceIncludeUsers?.join(", ") || "");
      setForceExcludeUsers(data.targeting?.forceExcludeUsers?.join(", ") || "");
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load flag");
    } finally {
      setIsLoadingFlag(false);
    }
  }, [platform, environment, flagKey]);

  useEffect(() => {
    loadFlag();
  }, [loadFlag]);

  // Country/Language pair management
  function addCountryLanguagePair() {
    setCountryLanguagePairs([
      ...countryLanguagePairs,
      {
        id: crypto.randomUUID(),
        country: "",
        languages: "",
        serveValue: "A",
      },
    ]);
  }

  function updateCountryLanguagePair(
    id: string,
    update: Partial<{
      country: string;
      languages: string;
      serveValue: "A" | "B";
    }>,
  ) {
    setCountryLanguagePairs((prev) =>
      prev.map((pair) => (pair.id === id ? { ...pair, ...update } : pair)),
    );
  }

  function removeCountryLanguagePair(id: string) {
    setCountryLanguagePairs((prev) => prev.filter((pair) => pair.id !== id));
  }

  function parseValue(
    raw: string,
    type: FlagType,
  ): boolean | string | number | null {
    switch (type) {
      case "boolean":
        return raw === "true";
      case "number": {
        const parsed = Number(raw);
        if (raw.trim() === "" || Number.isNaN(parsed)) {
          return null; // Signal invalid number
        }
        return parsed;
      }
      default:
        return raw;
    }
  }

  // Navigation
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  function markCurrentStepAsCompleted() {
    const stepId = currentStep;
    const validation = stepValidation[stepId as keyof typeof stepValidation];
    if (validation?.isValid && !completedSteps.has(stepId)) {
      setCompletedSteps((prev) => new Set([...prev, stepId]));
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
      const targetIndex = STEPS.findIndex((s) => s.id === stepId);
      if (targetIndex > currentStepIndex) {
        markCurrentStepAsCompleted();
      }
      setCurrentStep(stepId);
    }
  }

  // Handle rollout percentage slider change
  function handleRolloutPercentageChange(newPercentageA: number) {
    setRolloutPercentageA(newPercentageA);
    setRolloutPercentageB(100 - newPercentageA);
    setRolloutSuccess(false);
  }

  // Save rollout settings (separate from main form)
  async function handleSaveRollout() {
    setRolloutError(null);
    setRolloutSuccess(false);
    setRolloutSaving(true);

    try {
      await updateFlagRolloutApi(platform, environment, flagKey, {
        rolloutEnabled,
        rolloutPercentageA,
        rolloutPercentageB,
      });
      setRolloutSuccess(true);
      await loadFlag();
    } catch (err) {
      setRolloutError(
        err instanceof Error ? err.message : "Failed to update rollout",
      );
    } finally {
      setRolloutSaving(false);
    }
  }

  // Check if all steps are valid for submission
  const canSubmit =
    stepValidation.basic.isValid &&
    stepValidation.values.isValid &&
    stepValidation.targeting.isValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      if (!stepValidation.basic.isValid) {
        setCurrentStep("basic");
        setError(stepValidation.basic.errors[0]);
      } else if (!stepValidation.values.isValid) {
        setCurrentStep("values");
        setError(stepValidation.values.errors[0]);
      } else if (!stepValidation.targeting.isValid) {
        setCurrentStep("targeting");
        setError(stepValidation.targeting.errors[0]);
      }
      return;
    }

    // Validate number values
    const parsedValueA = parseValue(valueA, flagType);
    const parsedValueB = parseValue(valueB, flagType);
    if (parsedValueA === null) {
      setError("Value A must be a valid number");
      return;
    }
    if (parsedValueB === null) {
      setError("Value B must be a valid number");
      return;
    }

    setIsLoading(true);

    try {
      // Build targeting object with serveValue
      const targeting: {
        countries?: {
          country: string;
          serveValue: "A" | "B";
          languages?: { language: string; serveValue: "A" | "B" }[];
        }[];
        forceIncludeUsers?: string[];
        forceExcludeUsers?: string[];
      } = {};

      const validPairs = countryLanguagePairs.filter((p) => p.country.trim());
      if (validPairs.length > 0) {
        targeting.countries = validPairs.map((pair) => {
          const validLangs = validateLanguages(pair.languages);
          return {
            country: pair.country.trim().toUpperCase(),
            serveValue: pair.serveValue,
            languages:
              validLangs.valid.length > 0
                ? validLangs.valid.map((l) => ({
                    language: l,
                    serveValue: pair.serveValue,
                  }))
                : undefined,
          };
        });
      }

      // Use validated user lists
      if (includeUsersValidation.valid.length > 0) {
        targeting.forceIncludeUsers = includeUsersValidation.valid;
      }
      if (excludeUsersValidation.valid.length > 0) {
        targeting.forceExcludeUsers = excludeUsersValidation.valid;
      }

      await updateFlagApi(platform, environment, flagKey, {
        name: name.trim(),
        description: description.trim() || undefined,
        enabled,
        valueA: parsedValueA,
        valueB: parsedValueB,
        targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
      });

      router.push(`/flags?platform=${platform}&environment=${environment}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // Render validation feedback for user lists
  function renderUserListValidation(validation: ValidationResult) {
    const hasIssues =
      validation.duplicates.length > 0 || validation.invalid.length > 0;
    if (!hasIssues && validation.valid.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {validation.valid.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {validation.valid.length} valid{" "}
            {validation.valid.length === 1 ? "user" : "users"}
          </p>
        )}
        {validation.duplicates.length > 0 && (
          <p className="text-xs text-warning">
            {validation.duplicates.length} duplicate
            {validation.duplicates.length === 1 ? "" : "s"} will be ignored:{" "}
            {validation.duplicates.slice(0, 3).join(", ")}
            {validation.duplicates.length > 3 ? "..." : ""}
          </p>
        )}
        {validation.invalid.length > 0 && (
          <p className="text-xs text-destructive">
            {validation.invalid.length} invalid format:{" "}
            {validation.invalid.slice(0, 3).join(", ")}
            {validation.invalid.length > 3 ? "..." : ""}
          </p>
        )}
      </div>
    );
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
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading flag
            </div>
            <p className="text-muted-foreground mb-4">
              {loadError || "Flag not found"}
            </p>
            <Link
              href={`/flags?platform=${platform}&environment=${environment}`}
            >
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
          <Link href={`/flags?platform=${platform}&environment=${environment}`}>
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
        {currentStep === "basic" && (
          <div className="space-y-6">
            {/* Flag Identity (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle>Flag Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Flag Key (immutable)</Label>
                    <Input value={flag.flagKey} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Flag Type (immutable)</Label>
                    <Input
                      value={
                        flagType === "boolean"
                          ? "Boolean (true/false)"
                          : flagType === "string"
                            ? "String (text values)"
                            : "Number (numeric values)"
                      }
                      disabled
                      className="bg-muted"
                    />
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

            {!stepValidation.basic.isValid &&
              stepValidation.basic.errors.length > 0 && (
                <Alert variant="warning">
                  <span>
                    Missing required fields:{" "}
                    {stepValidation.basic.errors.join(", ")}
                  </span>
                </Alert>
              )}
          </div>
        )}

        {/* Step 2: Values */}
        {currentStep === "values" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Flag Values</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="valueA">
                      Value A (served when enabled)
                    </Label>
                    {flagType === "boolean" ? (
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
                        type={flagType === "number" ? "number" : "text"}
                        value={valueA}
                        onChange={(e) => setValueA(e.target.value)}
                        placeholder={flagType === "number" ? "0" : "value"}
                        disabled={isLoading}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Served when flag conditions are not met
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueB">Value B (rollout)</Label>
                    {flagType === "boolean" ? (
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
                        type={flagType === "number" ? "number" : "text"}
                        value={valueB}
                        onChange={(e) => setValueB(e.target.value)}
                        placeholder={flagType === "number" ? "0" : "value"}
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
                        Enable flag
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When disabled, the flag will serve Value A to all users
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gradual Rollout */}
            <Card>
              <CardHeader>
                <CardTitle>Gradual Rollout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="rolloutEnabled"
                    checked={rolloutEnabled}
                    onChange={(e) => {
                      setRolloutEnabled(e.target.checked);
                      setRolloutSuccess(false);
                    }}
                    disabled={rolloutSaving}
                  />
                  <Label htmlFor="rolloutEnabled" className="cursor-pointer">
                    Enable percentage-based rollout
                  </Label>
                </div>

                {rolloutEnabled && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Traffic Distribution</Label>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium w-24">
                          Value A: {rolloutPercentageA}%
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={rolloutPercentageA}
                          onChange={(e) =>
                            handleRolloutPercentageChange(
                              parseInt(e.target.value),
                            )
                          }
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          disabled={rolloutSaving}
                        />
                        <span className="text-sm font-medium w-24 text-right">
                          Value B: {rolloutPercentageB}%
                        </span>
                      </div>
                    </div>

                    {/* Visual bar */}
                    <div className="h-4 rounded-full overflow-hidden flex">
                      <div
                        className="bg-primary transition-all duration-200"
                        style={{ width: `${rolloutPercentageA}%` }}
                      />
                      <div
                        className="bg-gray-300 transition-all duration-200"
                        style={{ width: `${rolloutPercentageB}%` }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {rolloutPercentageA}% of users will receive Value A (
                      {String(valueA)}), {rolloutPercentageB}% will receive
                      Value B ({String(valueB)}). Users are consistently
                      assigned based on their user ID hash.
                    </p>
                  </div>
                )}

                {!rolloutEnabled && (
                  <p className="text-sm text-muted-foreground">
                    When disabled, users receive the configured default value
                    (Value B by default). Enable rollout for gradual feature
                    releases.
                  </p>
                )}

                {rolloutError && (
                  <Alert variant="destructive">{rolloutError}</Alert>
                )}

                {rolloutSuccess && (
                  <Alert>Rollout settings saved successfully!</Alert>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveRollout}
                    disabled={rolloutSaving}
                  >
                    {rolloutSaving ? "Saving..." : "Save Rollout Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Targeting */}
        {currentStep === "targeting" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Targeting (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Country/Language Pairs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      Country/Language Targeting
                    </Label>
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
                      No country targeting configured. Flag will apply to all
                      users.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {countryLanguagePairs.map((pair) => {
                        const countryValidation = validateCountryCode(
                          pair.country,
                        );
                        const langValidation = validateLanguages(
                          pair.languages,
                        );
                        const hasCountryError =
                          pair.country.trim() && !countryValidation.valid;
                        const hasLangError = langValidation.invalid.length > 0;

                        return (
                          <div
                            key={pair.id}
                            className="p-3 bg-muted/50 rounded-lg space-y-2"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Country Code (2-letter ISO)
                                  </Label>
                                  <Input
                                    value={pair.country}
                                    onChange={(e) =>
                                      updateCountryLanguagePair(pair.id, {
                                        country: e.target.value.toUpperCase(),
                                      })
                                    }
                                    placeholder="e.g., AE"
                                    disabled={isLoading}
                                    className={`uppercase ${hasCountryError ? "border-destructive" : ""}`}
                                    maxLength={2}
                                  />
                                  {hasCountryError && (
                                    <p className="text-xs text-destructive">
                                      Must be 2 uppercase letters
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Languages (comma-separated)
                                  </Label>
                                  <Input
                                    value={pair.languages}
                                    onChange={(e) =>
                                      updateCountryLanguagePair(pair.id, {
                                        languages: e.target.value,
                                      })
                                    }
                                    placeholder="e.g., en, ar"
                                    disabled={isLoading}
                                    className={
                                      hasLangError ? "border-destructive" : ""
                                    }
                                  />
                                  {langValidation.valid.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {langValidation.valid.length} language
                                      {langValidation.valid.length === 1
                                        ? ""
                                        : "s"}
                                      : {langValidation.valid.join(", ")}
                                    </p>
                                  )}
                                  {langValidation.duplicates.length > 0 && (
                                    <p className="text-xs text-warning">
                                      Duplicates ignored:{" "}
                                      {langValidation.duplicates.join(", ")}
                                    </p>
                                  )}
                                  {langValidation.invalid.length > 0 && (
                                    <p className="text-xs text-destructive">
                                      Invalid:{" "}
                                      {langValidation.invalid.join(", ")} (must
                                      be 2 lowercase letters)
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Serve Value</Label>
                                  <Select
                                    value={pair.serveValue}
                                    onChange={(e) =>
                                      updateCountryLanguagePair(pair.id, {
                                        serveValue: e.target.value as "A" | "B",
                                      })
                                    }
                                    disabled={isLoading}
                                  >
                                    <option value="A">Serve A</option>
                                    <option value="B">Serve B</option>
                                  </Select>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeCountryLanguagePair(pair.id)
                                }
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
                        Each country can have multiple languages. Leave
                        languages empty for all languages in that country. Serve
                        Value determines which value (A or B) is served when
                        users match this targeting rule.
                      </p>
                    </div>
                  )}
                </div>

                {/* Force Include/Exclude Users */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forceIncludeUsers">
                      Force Include Users
                    </Label>
                    <textarea
                      id="forceIncludeUsers"
                      value={forceIncludeUsers}
                      onChange={(e) => setForceIncludeUsers(e.target.value)}
                      placeholder="user123, user456, user789"
                      className={`w-full p-3 border rounded-lg min-h-[80px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200 resize-y ${
                        includeUsersValidation.invalid.length > 0
                          ? "border-destructive"
                          : "border-black/20"
                      }`}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      User IDs always included in flag (comma or newline
                      separated)
                    </p>
                    {renderUserListValidation(includeUsersValidation)}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forceExcludeUsers">
                      Force Exclude Users
                    </Label>
                    <textarea
                      id="forceExcludeUsers"
                      value={forceExcludeUsers}
                      onChange={(e) => setForceExcludeUsers(e.target.value)}
                      placeholder="user789, user012"
                      className={`w-full p-3 border rounded-lg min-h-[80px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200 resize-y ${
                        excludeUsersValidation.invalid.length > 0
                          ? "border-destructive"
                          : "border-black/20"
                      }`}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      User IDs always excluded from flag (comma or newline
                      separated)
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
            <Link
              href={`/flags?platform=${platform}&environment=${environment}`}
            >
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
            {currentStepIndex < STEPS.length - 1 ? (
              <Button type="button" onClick={goToNextStep} disabled={isLoading}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || !canSubmit}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
