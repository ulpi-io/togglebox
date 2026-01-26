import { browserApiClient } from './browser-client';
import type { FlagEvaluationResult, VariantAssignment, ConfigVersion, Flag, Experiment } from './types';

/**
 * Evaluation context for testing flags and experiments.
 * Used to simulate what a specific user would see.
 */
export interface EvaluationContext {
  userId?: string;
  country?: string;
  language?: string;
}

/**
 * Timed result wrapper - includes response time for performance monitoring.
 */
export interface TimedResult<T> {
  data: T;
  responseTimeMs: number;
}

/**
 * Helper to measure API call response time.
 */
async function withTiming<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
  const start = performance.now();
  const data = await fn();
  const responseTimeMs = Math.round(performance.now() - start);
  return { data, responseTimeMs };
}

/**
 * Evaluate a flag for a specific user context.
 * Three-Tier Architecture - Tier 2: Feature Flags
 *
 * Use this to test "What value would this user get?"
 * before deploying flag changes.
 */
export async function evaluateFlagApi(
  platform: string,
  environment: string,
  flagKey: string,
  context: EvaluationContext
): Promise<FlagEvaluationResult> {
  const queryParams = new URLSearchParams();
  if (context.userId) queryParams.append('userId', context.userId);
  if (context.country) queryParams.append('country', context.country);
  if (context.language) queryParams.append('language', context.language);

  return browserApiClient<FlagEvaluationResult>(
    `/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}/evaluate?${queryParams.toString()}`
  );
}

/**
 * Evaluate an experiment for a specific user context.
 * Three-Tier Architecture - Tier 3: A/B Experiments
 *
 * Use this to test "Which variation would this user be assigned to?"
 * before starting or modifying experiments.
 *
 * Note: The API calls this "assign" but conceptually it's the same as
 * flag "evaluate" - testing what a user would see.
 */
export async function evaluateExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
  context: EvaluationContext
): Promise<VariantAssignment> {
  const queryParams = new URLSearchParams();
  if (context.userId) queryParams.append('userId', context.userId);
  if (context.country) queryParams.append('country', context.country);
  if (context.language) queryParams.append('language', context.language);

  return browserApiClient<VariantAssignment>(
    `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/assign?${queryParams.toString()}`
  );
}

// ============================================================================
// Timed Evaluation Functions - Include response time for performance monitoring
// ============================================================================

/**
 * Evaluate a flag with timing information.
 */
export async function evaluateFlagWithTimingApi(
  platform: string,
  environment: string,
  flagKey: string,
  context: EvaluationContext
): Promise<TimedResult<FlagEvaluationResult>> {
  return withTiming(() => evaluateFlagApi(platform, environment, flagKey, context));
}

/**
 * Evaluate an experiment with timing information.
 */
export async function evaluateExperimentWithTimingApi(
  platform: string,
  environment: string,
  experimentKey: string,
  context: EvaluationContext
): Promise<TimedResult<VariantAssignment>> {
  return withTiming(() => evaluateExperimentApi(platform, environment, experimentKey, context));
}

// ============================================================================
// Fetch All Functions - Bulk fetch for "All" tab
// ============================================================================

/**
 * Fetch the latest stable config for an environment with timing.
 * Three-Tier Architecture - Tier 1: Remote Configs (static JSON, no targeting)
 */
export async function fetchConfigWithTimingApi(
  platform: string,
  environment: string
): Promise<TimedResult<ConfigVersion>> {
  return withTiming(() =>
    browserApiClient<ConfigVersion>(
      `/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`
    )
  );
}

/**
 * Fetch all configs (all versions) for an environment with timing.
 */
export async function fetchAllConfigsWithTimingApi(
  platform: string,
  environment: string
): Promise<TimedResult<ConfigVersion[]>> {
  return withTiming(() =>
    browserApiClient<ConfigVersion[]>(
      `/api/v1/platforms/${platform}/environments/${environment}/versions`
    )
  );
}

/**
 * Fetch all flags for an environment with timing.
 */
export async function fetchAllFlagsWithTimingApi(
  platform: string,
  environment: string
): Promise<TimedResult<Flag[]>> {
  return withTiming(() =>
    browserApiClient<Flag[]>(
      `/api/v1/platforms/${platform}/environments/${environment}/flags`
    )
  );
}

/**
 * Fetch all experiments for an environment with timing.
 */
export async function fetchAllExperimentsWithTimingApi(
  platform: string,
  environment: string
): Promise<TimedResult<Experiment[]>> {
  return withTiming(() =>
    browserApiClient<Experiment[]>(
      `/api/v1/platforms/${platform}/environments/${environment}/experiments`
    )
  );
}

/**
 * Combined result for fetching everything at once.
 */
export interface AllDataResult {
  config: ConfigVersion | null;
  flags: Flag[];
  experiments: Experiment[];
}

/**
 * Fetch all data (config, flags, experiments) for an environment with timing.
 * Used by the "All" tab to demonstrate full environment fetch performance.
 */
export async function fetchAllDataWithTimingApi(
  platform: string,
  environment: string
): Promise<TimedResult<AllDataResult>> {
  return withTiming(async () => {
    const [configResult, flagsResult, experimentsResult] = await Promise.all([
      browserApiClient<ConfigVersion>(
        `/api/v1/platforms/${platform}/environments/${environment}/versions/latest/stable`
      ).catch(() => null),
      browserApiClient<Flag[]>(
        `/api/v1/platforms/${platform}/environments/${environment}/flags`
      ).catch(() => []),
      browserApiClient<Experiment[]>(
        `/api/v1/platforms/${platform}/environments/${environment}/experiments`
      ).catch(() => []),
    ]);

    return {
      config: configResult,
      flags: flagsResult,
      experiments: experimentsResult,
    };
  });
}
