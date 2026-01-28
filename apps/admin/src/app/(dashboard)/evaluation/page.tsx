"use client";

import { useState, useEffect } from "react";
import {
  evaluateFlagWithTimingApi,
  evaluateExperimentWithTimingApi,
  fetchConfigWithTimingApi,
  fetchAllFlagsWithTimingApi,
  fetchAllExperimentsWithTimingApi,
  fetchAllDataWithTimingApi,
  type TimedResult,
  type AllDataResult,
} from "@/lib/api/evaluation";
import { getPlatformsApi, getEnvironmentsApi } from "@/lib/api/platforms";
import { getFlagsApi } from "@/lib/api/flags";
import { getExperimentsApi } from "@/lib/api/experiments";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Button,
  Select,
} from "@togglebox/ui";
import type {
  Platform,
  Environment,
  Flag,
  FlagEvaluationResult,
  Experiment,
  VariantAssignment,
} from "@/lib/api/types";
import {
  Clock,
  Zap,
  Database,
  Flag as FlagIcon,
  FlaskConical,
  Layers,
} from "lucide-react";

type EvaluationType = "config" | "flag" | "experiment" | "all";

/**
 * Response time indicator with color coding.
 */
function ResponseTime({ ms }: { ms: number }) {
  const getColor = (time: number) => {
    if (time < 100) return "text-green-600 bg-green-100 border-green-200";
    if (time < 300) return "text-yellow-600 bg-yellow-100 border-yellow-200";
    return "text-red-600 bg-red-100 border-red-200";
  };

  const getLabel = (time: number) => {
    if (time < 100) return "Fast";
    if (time < 300) return "OK";
    return "Slow";
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm font-mono ${getColor(ms)}`}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>{ms}ms</span>
      <span className="text-xs opacity-75">({getLabel(ms)})</span>
    </div>
  );
}

/**
 * Evaluation Page - Three-Tier Architecture Testing
 * Test configs, flags, or experiments with user context and measure response times.
 */
export default function EvaluationPage() {
  // Evaluation type
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("flag");

  // Selection states
  const [platform, setPlatform] = useState("");
  const [environment, setEnvironment] = useState("");
  const [flagKey, setFlagKey] = useState("");
  const [experimentKey, setExperimentKey] = useState("");
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");

  // Data states
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  // Loading states
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isLoadingFlags, setIsLoadingFlags] = useState(false);
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(false);

  // Results with timing
  const [configResult, setConfigResult] = useState<TimedResult<
    Record<string, unknown>
  > | null>(null);
  const [flagResult, setFlagResult] =
    useState<TimedResult<FlagEvaluationResult> | null>(null);
  const [experimentResult, setExperimentResult] =
    useState<TimedResult<VariantAssignment> | null>(null);
  const [allFlagsResult, setAllFlagsResult] = useState<TimedResult<
    Flag[]
  > | null>(null);
  const [allExperimentsResult, setAllExperimentsResult] = useState<TimedResult<
    Experiment[]
  > | null>(null);
  const [allDataResult, setAllDataResult] =
    useState<TimedResult<AllDataResult> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    let isMounted = true;

    async function loadPlatforms() {
      try {
        const data = await getPlatformsApi();
        if (isMounted) setPlatforms(data);
      } catch {
        // Silently ignore
      } finally {
        if (isMounted) setIsLoadingPlatforms(false);
      }
    }
    loadPlatforms();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (!platform) {
      setEnvironments([]);
      setEnvironment("");
      setFlags([]);
      setFlagKey("");
      return;
    }

    let isMounted = true;

    async function loadEnvironments() {
      setIsLoadingEnvironments(true);
      try {
        const data = await getEnvironmentsApi(platform);
        if (!isMounted) return;
        setEnvironments(data);
        setEnvironment("");
        setFlags([]);
        setFlagKey("");
      } catch {
        if (isMounted) setEnvironments([]);
      } finally {
        if (isMounted) setIsLoadingEnvironments(false);
      }
    }
    loadEnvironments();

    return () => {
      isMounted = false;
    };
  }, [platform]);

  // Load flags and experiments when environment changes
  useEffect(() => {
    if (!platform || !environment) {
      setFlags([]);
      setExperiments([]);
      setFlagKey("");
      setExperimentKey("");
      return;
    }

    let isMounted = true;

    async function loadFlagsAndExperiments() {
      setIsLoadingFlags(true);
      setIsLoadingExperiments(true);
      try {
        const [flagsData, experimentsData] = await Promise.all([
          getFlagsApi(platform, environment),
          getExperimentsApi(platform, environment),
        ]);
        if (!isMounted) return;
        setFlags(flagsData);
        setExperiments(
          experimentsData.filter(
            (e) => e.status === "running" || e.status === "paused",
          ),
        );
        setFlagKey("");
        setExperimentKey("");
      } catch {
        if (isMounted) {
          setFlags([]);
          setExperiments([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFlags(false);
          setIsLoadingExperiments(false);
        }
      }
    }
    loadFlagsAndExperiments();

    return () => {
      isMounted = false;
    };
  }, [platform, environment]);

  // Clear results when type changes
  const clearResults = () => {
    setConfigResult(null);
    setFlagResult(null);
    setExperimentResult(null);
    setAllFlagsResult(null);
    setAllExperimentsResult(null);
    setAllDataResult(null);
    setError(null);
  };

  async function handleEvaluate() {
    if (!platform || !environment) {
      setError("Platform and environment are required");
      return;
    }

    // Validation for types that need specific selection
    if (evaluationType === "flag" && !flagKey) {
      setError("Flag key is required");
      return;
    }

    if (evaluationType === "experiment" && !experimentKey) {
      setError("Experiment key is required");
      return;
    }

    // Validation for types that need user context
    if (
      (evaluationType === "flag" || evaluationType === "experiment") &&
      !userId.trim()
    ) {
      setError("User ID is required for flag/experiment evaluation");
      return;
    }

    setIsEvaluating(true);
    clearResults();

    try {
      const context = {
        userId: userId.trim() || undefined,
        country: country || undefined,
        language: language || undefined,
      };

      switch (evaluationType) {
        case "config": {
          const result = await fetchConfigWithTimingApi(platform, environment);
          setConfigResult(result);
          break;
        }
        case "flag": {
          const result = await evaluateFlagWithTimingApi(
            platform,
            environment,
            flagKey,
            context,
          );
          setFlagResult(result);
          break;
        }
        case "experiment": {
          const result = await evaluateExperimentWithTimingApi(
            platform,
            environment,
            experimentKey,
            context,
          );
          setExperimentResult(result);
          break;
        }
        case "all": {
          // Fetch all data for the environment
          const result = await fetchAllDataWithTimingApi(platform, environment);
          setAllDataResult(result);
          break;
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to evaluate ${evaluationType}`,
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  // Quick fetch buttons for "all" mode
  async function handleFetchAllFlags() {
    if (!platform || !environment) return;
    setIsEvaluating(true);
    clearResults();
    try {
      const result = await fetchAllFlagsWithTimingApi(platform, environment);
      setAllFlagsResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch flags");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleFetchAllExperiments() {
    if (!platform || !environment) return;
    setIsEvaluating(true);
    clearResults();
    try {
      const result = await fetchAllExperimentsWithTimingApi(
        platform,
        environment,
      );
      setAllExperimentsResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch experiments",
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  const needsSelection =
    evaluationType === "flag" || evaluationType === "experiment";
  const needsUserContext =
    evaluationType === "flag" || evaluationType === "experiment";
  const selectedKey = evaluationType === "flag" ? flagKey : experimentKey;

  const hasAnyResult =
    configResult ||
    flagResult ||
    experimentResult ||
    allFlagsResult ||
    allExperimentsResult ||
    allDataResult;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Evaluation Tester</h1>
        <p className="text-muted-foreground">
          Test configs, flags, and experiments with response time monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Context</CardTitle>
            <CardDescription>
              Select what to evaluate and see response times
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Evaluation Type Toggle */}
            <div className="space-y-2">
              <Label>Evaluation Type</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={evaluationType === "config" ? "default" : "outline"}
                  onClick={() => {
                    setEvaluationType("config");
                    clearResults();
                  }}
                  disabled={isEvaluating}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <Layers className="h-4 w-4" />
                  <span className="text-xs">Config</span>
                </Button>
                <Button
                  type="button"
                  variant={evaluationType === "flag" ? "default" : "outline"}
                  onClick={() => {
                    setEvaluationType("flag");
                    clearResults();
                  }}
                  disabled={isEvaluating}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <FlagIcon className="h-4 w-4" />
                  <span className="text-xs">Flag</span>
                </Button>
                <Button
                  type="button"
                  variant={
                    evaluationType === "experiment" ? "default" : "outline"
                  }
                  onClick={() => {
                    setEvaluationType("experiment");
                    clearResults();
                  }}
                  disabled={isEvaluating}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <FlaskConical className="h-4 w-4" />
                  <span className="text-xs">Experiment</span>
                </Button>
                <Button
                  type="button"
                  variant={evaluationType === "all" ? "default" : "outline"}
                  onClick={() => {
                    setEvaluationType("all");
                    clearResults();
                  }}
                  disabled={isEvaluating}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <Database className="h-4 w-4" />
                  <span className="text-xs">All</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isEvaluating || isLoadingPlatforms}
              >
                <option value="">
                  {isLoadingPlatforms
                    ? "Loading platforms..."
                    : "Select a platform"}
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
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                disabled={isEvaluating || !platform || isLoadingEnvironments}
              >
                <option value="">
                  {!platform
                    ? "Select a platform first"
                    : isLoadingEnvironments
                      ? "Loading environments..."
                      : "Select an environment"}
                </option>
                {environments.map((e) => (
                  <option key={e.environment} value={e.environment}>
                    {e.environment}
                  </option>
                ))}
              </Select>
            </div>

            {evaluationType === "flag" && (
              <div className="space-y-2">
                <Label htmlFor="flagKey">Flag Key *</Label>
                <Select
                  id="flagKey"
                  value={flagKey}
                  onChange={(e) => setFlagKey(e.target.value)}
                  disabled={isEvaluating || !environment || isLoadingFlags}
                >
                  <option value="">
                    {!environment
                      ? "Select an environment first"
                      : isLoadingFlags
                        ? "Loading flags..."
                        : flags.length === 0
                          ? "No flags available"
                          : "Select a flag"}
                  </option>
                  {flags.map((f) => (
                    <option key={f.flagKey} value={f.flagKey}>
                      {f.flagKey}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {evaluationType === "experiment" && (
              <div className="space-y-2">
                <Label htmlFor="experimentKey">Experiment Key *</Label>
                <Select
                  id="experimentKey"
                  value={experimentKey}
                  onChange={(e) => setExperimentKey(e.target.value)}
                  disabled={
                    isEvaluating || !environment || isLoadingExperiments
                  }
                >
                  <option value="">
                    {!environment
                      ? "Select an environment first"
                      : isLoadingExperiments
                        ? "Loading experiments..."
                        : experiments.length === 0
                          ? "No running experiments"
                          : "Select an experiment"}
                  </option>
                  {experiments.map((exp) => (
                    <option key={exp.experimentKey} value={exp.experimentKey}>
                      {exp.experimentKey} ({exp.status})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {needsUserContext && (
              <div className="border-t border-black/10 pt-4 mt-4">
                <p className="text-sm font-bold mb-3">User Context</p>

                <div className="space-y-2">
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g., user123"
                    disabled={isEvaluating}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for evaluation
                  </p>
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="country">Country (optional)</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g., US, UK, CA"
                    disabled={isEvaluating}
                  />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="language">Language (optional)</Label>
                  <Input
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g., en, es, fr"
                    disabled={isEvaluating}
                  />
                </div>
              </div>
            )}

            {evaluationType === "all" && (
              <div className="border-t border-black/10 pt-4 mt-4 space-y-3">
                <p className="text-sm font-bold">Bulk Fetch Options</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Fetch all data for an environment to test API performance
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleFetchAllFlags}
                    disabled={isEvaluating || !platform || !environment}
                    className="flex items-center gap-2"
                  >
                    <FlagIcon className="h-4 w-4" />
                    All Flags
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleFetchAllExperiments}
                    disabled={isEvaluating || !platform || !environment}
                    className="flex items-center gap-2"
                  >
                    <FlaskConical className="h-4 w-4" />
                    All Experiments
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleEvaluate}
              disabled={
                isEvaluating ||
                !platform ||
                !environment ||
                (needsSelection && !selectedKey) ||
                (needsUserContext && !userId.trim())
              }
              className="w-full mt-4"
            >
              {isEvaluating ? (
                "Fetching..."
              ) : evaluationType === "all" ? (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Fetch Everything
                </>
              ) : evaluationType === "config" ? (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Fetch Config
                </>
              ) : (
                `Evaluate ${evaluationType === "flag" ? "Flag" : "Experiment"}`
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Results</span>
              {hasAnyResult && (
                <Badge variant="secondary" className="font-mono">
                  <Clock className="h-3 w-3 mr-1" />
                  {configResult?.responseTimeMs ||
                    flagResult?.responseTimeMs ||
                    experimentResult?.responseTimeMs ||
                    allFlagsResult?.responseTimeMs ||
                    allExperimentsResult?.responseTimeMs ||
                    allDataResult?.responseTimeMs}
                  ms
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {evaluationType === "config"
                ? "Latest stable config (static JSON, no user targeting)"
                : evaluationType === "flag"
                  ? "Flag evaluation result (2-value model)"
                  : evaluationType === "experiment"
                    ? "Experiment variation assignment"
                    : "All data for the environment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasAnyResult && !error && (
              <div className="text-center py-12 text-muted-foreground">
                Select evaluation context and click the button to see results
              </div>
            )}

            {error && <Alert variant="destructive">{error}</Alert>}

            {/* Config Result */}
            {configResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">Config Result</span>
                  <ResponseTime ms={configResult.responseTimeMs} />
                </div>
                <div className="border border-black/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xl font-black">
                      {Object.keys(configResult.data).length} Parameters
                    </div>
                    <Badge variant="default">Firebase-style</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Key-value pairs (active versions only)
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-2">Config Data:</div>
                    <pre className="p-3 bg-muted border border-black/10 rounded font-mono text-xs max-h-64 overflow-auto">
                      {JSON.stringify(configResult.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Flag Result */}
            {flagResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">Flag Evaluation</span>
                  <ResponseTime ms={flagResult.responseTimeMs} />
                </div>
                <div className="border border-black/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-black">
                      {flagResult.data.flagKey}
                    </div>
                    <Badge
                      variant={
                        flagResult.data.enabled ? "default" : "secondary"
                      }
                      size="lg"
                      className="text-lg font-black"
                    >
                      {flagResult.data.enabled ? "ENABLED" : "DISABLED"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-bold mb-1">Variant</div>
                      <div
                        className={`px-3 py-2 text-center font-black rounded border ${
                          flagResult.data.variant === "A"
                            ? "bg-info/10 border-info/50"
                            : "bg-success/10 border-success/50"
                        }`}
                      >
                        {flagResult.data.variant}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold mb-1">Value</div>
                      <div className="px-3 py-2 bg-muted border border-black/10 rounded font-mono">
                        {JSON.stringify(flagResult.data.value)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold mb-2">Reason:</div>
                    <p className="text-sm">{flagResult.data.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Experiment Result */}
            {experimentResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">
                    Experiment Assignment
                  </span>
                  <ResponseTime ms={experimentResult.responseTimeMs} />
                </div>
                <div className="border border-black/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-black">
                      {experimentResult.data.experimentKey}
                    </div>
                    <Badge
                      variant={
                        experimentResult.data.isControl
                          ? "secondary"
                          : "default"
                      }
                      size="lg"
                      className="text-lg font-black"
                    >
                      {experimentResult.data.isControl
                        ? "CONTROL"
                        : "TREATMENT"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-bold mb-1">
                        Variation Key
                      </div>
                      <div className="px-3 py-2 text-center font-black rounded border bg-info/10 border-info/50">
                        {experimentResult.data.variationKey}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold mb-1">Value</div>
                      <div className="px-3 py-2 bg-muted border border-black/10 rounded font-mono overflow-x-auto">
                        {JSON.stringify(experimentResult.data.value)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold mb-2">Reason:</div>
                    <p className="text-sm">{experimentResult.data.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* All Flags Result */}
            {allFlagsResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">
                    All Flags ({allFlagsResult.data.length})
                  </span>
                  <ResponseTime ms={allFlagsResult.responseTimeMs} />
                </div>
                <div className="border border-black/20 rounded-lg p-4 max-h-96 overflow-auto">
                  {allFlagsResult.data.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No flags found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allFlagsResult.data.map((f) => (
                        <div
                          key={f.flagKey}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded"
                        >
                          <span className="font-mono text-sm">{f.flagKey}</span>
                          <Badge
                            variant={f.enabled ? "default" : "secondary"}
                            size="sm"
                          >
                            {f.enabled ? "ON" : "OFF"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Experiments Result */}
            {allExperimentsResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">
                    All Experiments ({allExperimentsResult.data.length})
                  </span>
                  <ResponseTime ms={allExperimentsResult.responseTimeMs} />
                </div>
                <div className="border border-black/20 rounded-lg p-4 max-h-96 overflow-auto">
                  {allExperimentsResult.data.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No experiments found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allExperimentsResult.data.map((e) => (
                        <div
                          key={e.experimentKey}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded"
                        >
                          <span className="font-mono text-sm">
                            {e.experimentKey}
                          </span>
                          <Badge
                            variant={
                              e.status === "running"
                                ? "default"
                                : e.status === "paused"
                                  ? "secondary"
                                  : "outline"
                            }
                            size="sm"
                          >
                            {e.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Data Result */}
            {allDataResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">
                    All Environment Data
                  </span>
                  <ResponseTime ms={allDataResult.responseTimeMs} />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="border border-black/20 rounded-lg p-3 text-center">
                    <Layers className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-black">
                      {allDataResult.data.config ? 1 : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Config</div>
                  </div>
                  <div className="border border-black/20 rounded-lg p-3 text-center">
                    <FlagIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-black">
                      {allDataResult.data.flags.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Flags</div>
                  </div>
                  <div className="border border-black/20 rounded-lg p-3 text-center">
                    <FlaskConical className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-black">
                      {allDataResult.data.experiments.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Experiments
                    </div>
                  </div>
                </div>

                {/* Config */}
                {allDataResult.data.config &&
                  Object.keys(allDataResult.data.config).length > 0 && (
                    <div className="border border-black/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">Config</span>
                        <Badge variant="default" size="sm">
                          {Object.keys(allDataResult.data.config).length} params
                        </Badge>
                      </div>
                      <pre className="text-xs font-mono bg-muted p-2 rounded max-h-32 overflow-auto">
                        {JSON.stringify(allDataResult.data.config, null, 2)}
                      </pre>
                    </div>
                  )}

                {/* Flags */}
                {allDataResult.data.flags.length > 0 && (
                  <div className="border border-black/20 rounded-lg p-3">
                    <div className="font-bold text-sm mb-2">
                      Flags ({allDataResult.data.flags.length})
                    </div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {allDataResult.data.flags.map((f) => (
                        <div
                          key={f.flagKey}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span className="font-mono">{f.flagKey}</span>
                          <Badge
                            variant={f.enabled ? "default" : "secondary"}
                            size="sm"
                          >
                            {f.enabled ? "ON" : "OFF"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiments */}
                {allDataResult.data.experiments.length > 0 && (
                  <div className="border border-black/20 rounded-lg p-3">
                    <div className="font-bold text-sm mb-2">
                      Experiments ({allDataResult.data.experiments.length})
                    </div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {allDataResult.data.experiments.map((e) => (
                        <div
                          key={e.experimentKey}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span className="font-mono">{e.experimentKey}</span>
                          <Badge
                            variant={
                              e.status === "running"
                                ? "default"
                                : e.status === "paused"
                                  ? "secondary"
                                  : "outline"
                            }
                            size="sm"
                          >
                            {e.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Evaluated Context (for flag/experiment) */}
            {(flagResult || experimentResult) && (
              <div className="text-xs text-muted-foreground mt-4">
                <div className="font-bold mb-2">Evaluated Context:</div>
                <pre className="p-3 bg-muted border border-black/10 rounded font-mono">
                  {JSON.stringify(
                    {
                      type: evaluationType,
                      platform,
                      environment,
                      ...(evaluationType === "flag" && { flagKey }),
                      ...(evaluationType === "experiment" && { experimentKey }),
                      userId,
                      ...(country && { country }),
                      ...(language && { language }),
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Performance Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1" />
              <div>
                <div className="font-bold">&lt; 100ms</div>
                <div className="text-muted-foreground">
                  Excellent - optimal for real-time
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1" />
              <div>
                <div className="font-bold">100-300ms</div>
                <div className="text-muted-foreground">
                  Good - acceptable latency
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1" />
              <div>
                <div className="font-bold">&gt; 300ms</div>
                <div className="text-muted-foreground">
                  Consider caching or optimization
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
