"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFlagApi } from "@/lib/api/flags";
import { ApiError } from "@/lib/api/browser-client";
import { usePlatformEnvironmentSelection } from "@/hooks/usePlatformEnvironmentSelection";
import {
  validateUserList,
  validateCountryCode,
  validateLanguages,
  validateFlagKey,
} from "@/lib/validation/targeting";
import {
  BasicInfoStep,
  ValuesStep,
  TargetingStep,
  type FlagType,
  type CountryLanguagePair,
} from "@/components/flags/create";
import {
  Button,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Steps,
} from "@togglebox/ui";

const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "values", label: "Values" },
  { id: "targeting", label: "Targeting" },
];

export default function CreateFlagPage() {
  const router = useRouter();

  // Step navigation
  const [currentStep, setCurrentStep] = useState("basic");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Platform/Environment selection (extracted hook)
  const {
    platforms,
    environments,
    selectedPlatform,
    selectedEnvironment,
    setSelectedPlatform,
    setSelectedEnvironment,
    loadingPlatforms,
    loadingEnvironments,
  } = usePlatformEnvironmentSelection();

  // Basic fields
  const [flagKey, setFlagKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flagType, setFlagType] = useState<FlagType>("boolean");
  const [enabled, setEnabled] = useState(false);

  // Values
  const [valueA, setValueA] = useState<string>("true");
  const [valueB, setValueB] = useState<string>("false");

  // Targeting
  const [countryLanguagePairs, setCountryLanguagePairs] = useState<
    CountryLanguagePair[]
  >([]);
  const [forceIncludeUsers, setForceIncludeUsers] = useState("");
  const [forceExcludeUsers, setForceExcludeUsers] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation results
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
    const flagKeyValidation = validateFlagKey(flagKey);

    const basic = {
      isValid: !!(
        selectedPlatform &&
        selectedEnvironment &&
        flagKey.trim() &&
        flagKeyValidation.valid &&
        name.trim()
      ),
      errors: [] as string[],
    };
    if (!selectedPlatform) basic.errors.push("Platform is required");
    if (!selectedEnvironment) basic.errors.push("Environment is required");
    if (!flagKey.trim()) basic.errors.push("Flag key is required");
    if (flagKey.trim() && !flagKeyValidation.valid && flagKeyValidation.error) {
      basic.errors.push(flagKeyValidation.error);
    }
    if (!name.trim()) basic.errors.push("Display name is required");

    const values = { isValid: true, errors: [] as string[] };

    const targeting = {
      isValid:
        includeUsersValidation.invalid.length === 0 &&
        excludeUsersValidation.invalid.length === 0,
      errors: [] as string[],
    };
    if (includeUsersValidation.invalid.length > 0) {
      targeting.errors.push(
        `Invalid include users: ${includeUsersValidation.invalid.join(", ")}`,
      );
    }
    if (excludeUsersValidation.invalid.length > 0) {
      targeting.errors.push(
        `Invalid exclude users: ${excludeUsersValidation.invalid.join(", ")}`,
      );
    }

    return { basic, values, targeting };
  }, [
    selectedPlatform,
    selectedEnvironment,
    flagKey,
    name,
    includeUsersValidation,
    excludeUsersValidation,
  ]);

  const canProceed = (step: string) => {
    if (step === "basic") return stepValidation.basic.isValid;
    if (step === "values") return stepValidation.values.isValid;
    if (step === "targeting") return stepValidation.targeting.isValid;
    return false;
  };

  const allStepsValid =
    stepValidation.basic.isValid &&
    stepValidation.values.isValid &&
    stepValidation.targeting.isValid;

  // Navigation handlers
  const handleStepClick = (stepId: string) => {
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

    if (stepIndex < currentIndex) {
      setCurrentStep(stepId);
    } else if (stepIndex === currentIndex + 1 && canProceed(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(stepId);
    }
  };

  const handleNext = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < STEPS.length - 1 && canProceed(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  // Flag type change handler (resets values)
  const handleFlagTypeChange = (newType: FlagType) => {
    setFlagType(newType);
    if (newType === "boolean") {
      setValueA("true");
      setValueB("false");
    } else if (newType === "number") {
      setValueA("1");
      setValueB("0");
    } else {
      setValueA("variant-a");
      setValueB("variant-b");
    }
  };

  // Country/language pair handlers
  const handleCountryChange = (id: string, country: string) => {
    const { formatted } = validateCountryCode(country);
    setCountryLanguagePairs((prev) =>
      prev.map((pair) =>
        pair.id === id ? { ...pair, country: formatted } : pair,
      ),
    );
  };

  const handleLanguagesChange = (id: string, languages: string) => {
    setCountryLanguagePairs((prev) =>
      prev.map((pair) => (pair.id === id ? { ...pair, languages } : pair)),
    );
  };

  const handleServeValueChange = (id: string, serveValue: "A" | "B") => {
    setCountryLanguagePairs((prev) =>
      prev.map((pair) => (pair.id === id ? { ...pair, serveValue } : pair)),
    );
  };

  const addCountryLanguagePair = () => {
    setCountryLanguagePairs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), country: "", languages: "", serveValue: "A" },
    ]);
  };

  const removeCountryLanguagePair = (id: string) => {
    setCountryLanguagePairs((prev) => prev.filter((pair) => pair.id !== id));
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!allStepsValid || !selectedPlatform || !selectedEnvironment) return;

    // Parse values
    const parseValue = (
      val: string,
      type: FlagType,
    ): string | number | boolean | null => {
      if (type === "boolean") return val === "true";
      if (type === "number") {
        const parsed = Number(val);
        return val.trim() === "" || Number.isNaN(parsed) ? null : parsed;
      }
      return val;
    };

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
    setError(null);

    const validCountries = countryLanguagePairs
      .filter((pair) => {
        const { valid } = validateCountryCode(pair.country);
        return valid && pair.country.trim();
      })
      .map((pair) => {
        const { valid: validLangs } = validateLanguages(pair.languages);
        return {
          country: pair.country.trim().toUpperCase(),
          serveValue: pair.serveValue,
          languages:
            validLangs.length > 0
              ? validLangs.map((l) => ({
                  language: l,
                  serveValue: pair.serveValue,
                }))
              : undefined,
        };
      });

    try {
      await createFlagApi(selectedPlatform, selectedEnvironment, {
        flagKey: flagKey.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        flagType,
        enabled,
        valueA: parsedValueA,
        valueB: parsedValueB,
        targeting: {
          countries: validCountries.length > 0 ? validCountries : undefined,
          forceIncludeUsers:
            includeUsersValidation.valid.length > 0
              ? includeUsersValidation.valid
              : undefined,
          forceExcludeUsers:
            excludeUsersValidation.valid.length > 0
              ? excludeUsersValidation.valid
              : undefined,
        },
      });
      router.push(
        `/flags?platform=${selectedPlatform}&environment=${selectedEnvironment}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.join(". "));
      } else {
        setError(err instanceof Error ? err.message : "Failed to create flag");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
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
          <CardTitle>
            {STEPS.find((s) => s.id === currentStep)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && <Alert variant="destructive">{error}</Alert>}

            {currentStep === "basic" && (
              <BasicInfoStep
                platforms={platforms}
                environments={environments}
                selectedPlatform={selectedPlatform}
                selectedEnvironment={selectedEnvironment}
                onPlatformChange={setSelectedPlatform}
                onEnvironmentChange={setSelectedEnvironment}
                loadingPlatforms={loadingPlatforms}
                loadingEnvironments={loadingEnvironments}
                flagKey={flagKey}
                name={name}
                description={description}
                flagType={flagType}
                onFlagKeyChange={setFlagKey}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onFlagTypeChange={handleFlagTypeChange}
              />
            )}

            {currentStep === "values" && (
              <ValuesStep
                flagType={flagType}
                valueA={valueA}
                valueB={valueB}
                enabled={enabled}
                onValueAChange={setValueA}
                onValueBChange={setValueB}
                onEnabledChange={setEnabled}
              />
            )}

            {currentStep === "targeting" && (
              <TargetingStep
                countryLanguagePairs={countryLanguagePairs}
                forceIncludeUsers={forceIncludeUsers}
                forceExcludeUsers={forceExcludeUsers}
                includeUsersValidation={includeUsersValidation}
                excludeUsersValidation={excludeUsersValidation}
                onCountryChange={handleCountryChange}
                onLanguagesChange={handleLanguagesChange}
                onServeValueChange={handleServeValueChange}
                onAddCountryLanguagePair={addCountryLanguagePair}
                onRemoveCountryLanguagePair={removeCountryLanguagePair}
                onForceIncludeUsersChange={setForceIncludeUsers}
                onForceExcludeUsersChange={setForceExcludeUsers}
              />
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
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !allStepsValid}
                  >
                    {isLoading ? "Creating..." : "Create Flag"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
