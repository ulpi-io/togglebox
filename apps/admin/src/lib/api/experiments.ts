import { browserApiClient } from "./browser-client";
import type {
  Experiment,
  ExperimentResults,
  Platform,
  Environment,
} from "./types";

/**
 * Get all experiments across all platforms and environments.
 * Used when no filter is applied.
 *
 * @param options - Optional fetch options including AbortSignal
 */
export async function getAllExperimentsApi(options?: {
  signal?: AbortSignal;
}): Promise<Experiment[]> {
  // First, get all platforms
  const platforms = await browserApiClient<Platform[]>("/api/v1/platforms", {
    signal: options?.signal,
  });

  // For each platform, get environments and then experiments
  const allExperiments: Experiment[] = [];

  await Promise.all(
    platforms.map(async (platform) => {
      try {
        const environments = await browserApiClient<Environment[]>(
          `/api/v1/platforms/${platform.name}/environments`,
          { signal: options?.signal },
        );

        await Promise.all(
          environments.map(async (env) => {
            try {
              const experiments = await browserApiClient<Experiment[]>(
                `/api/v1/platforms/${platform.name}/environments/${env.environment}/experiments`,
                { signal: options?.signal },
              );
              allExperiments.push(...experiments);
            } catch {
              // Environment may have no experiments, skip it
            }
          }),
        );
      } catch {
        // Platform may have no environments, skip it
      }
    }),
  );

  return allExperiments;
}

/**
 * Get all experiments for an environment.
 * Three-Tier Architecture - Tier 3: Experiments (A/B testing)
 *
 * @param platform - Platform name
 * @param environment - Environment name
 * @param status - Optional status filter
 * @param options - Optional fetch options including AbortSignal
 */
export async function getExperimentsApi(
  platform: string,
  environment: string,
  status?: "draft" | "running" | "paused" | "completed" | "archived",
  options?: { signal?: AbortSignal },
): Promise<Experiment[]> {
  const queryParams = status ? `?status=${status}` : "";
  return browserApiClient<Experiment[]>(
    `/api/v1/platforms/${platform}/environments/${environment}/experiments${queryParams}`,
    { signal: options?.signal },
  );
}

/**
 * Get a specific experiment.
 */
export async function getExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
  );
}

/**
 * Create a new experiment (draft status).
 * Tier 3: Multi-variant A/B testing with statistical analysis.
 */
export async function createExperimentApi(
  platform: string,
  environment: string,
  data: {
    experimentKey: string;
    name: string;
    description?: string;
    hypothesis: string;
    variations: Array<{
      key: string;
      name: string;
      value: unknown;
      isControl: boolean;
    }>;
    controlVariation: string;
    trafficAllocation: Array<{
      variationKey: string;
      percentage: number;
    }>;
    targeting?: {
      countries?: Array<{
        country: string;
        languages?: Array<{ language: string }>;
      }>;
      forceIncludeUsers?: string[];
      forceExcludeUsers?: string[];
    };
    primaryMetric: {
      id: string;
      name: string;
      eventName: string;
      metricType: "conversion" | "count" | "sum" | "average";
      successDirection: "increase" | "decrease";
      valueProperty?: string;
    };
    secondaryMetrics?: Array<{
      id: string;
      name: string;
      eventName: string;
      metricType: "conversion" | "count" | "sum" | "average";
      successDirection: "increase" | "decrease";
      valueProperty?: string;
    }>;
    confidenceLevel?: number;
    minimumDetectableEffect?: number;
    minimumSampleSize?: number;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
  },
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

/**
 * Update traffic allocation for a running/paused/draft experiment.
 * This allows adjusting rollout percentages without stopping the experiment.
 */
export async function updateExperimentTrafficApi(
  platform: string,
  environment: string,
  experimentKey: string,
  trafficAllocation: Array<{
    variationKey: string;
    percentage: number;
  }>,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/traffic`,
    {
      method: "PATCH",
      body: JSON.stringify({ trafficAllocation }),
    },
  );
}

/**
 * Update an experiment (only allowed in draft status).
 */
export async function updateExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
  data: {
    name?: string;
    description?: string;
    hypothesis?: string;
    variations?: Array<{
      key: string;
      name: string;
      value: unknown;
      isControl: boolean;
    }>;
    controlVariation?: string;
    trafficAllocation?: Array<{
      variationKey: string;
      percentage: number;
    }>;
    targeting?: {
      countries?: Array<{
        country: string;
        languages?: Array<{ language: string }>;
      }>;
      forceIncludeUsers?: string[];
      forceExcludeUsers?: string[];
    };
    primaryMetric?: {
      id: string;
      name: string;
      eventName: string;
      metricType: "conversion" | "count" | "sum" | "average";
      successDirection: "increase" | "decrease";
      valueProperty?: string;
    };
    secondaryMetrics?: Array<{
      id: string;
      name: string;
      eventName: string;
      metricType: "conversion" | "count" | "sum" | "average";
      successDirection: "increase" | "decrease";
      valueProperty?: string;
    }>;
    confidenceLevel?: number;
    minimumDetectableEffect?: number;
    minimumSampleSize?: number;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
  },
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

/**
 * Start an experiment (draft → running).
 */
export async function startExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
  startedBy: string,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/start`,
    {
      method: "POST",
      body: JSON.stringify({ startedBy }),
    },
  );
}

/**
 * Pause an experiment (running → paused).
 */
export async function pauseExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/pause`,
    {
      method: "POST",
    },
  );
}

/**
 * Resume an experiment (paused → running).
 */
export async function resumeExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/resume`,
    {
      method: "POST",
    },
  );
}

/**
 * Complete an experiment with optional winner (running/paused → completed).
 */
export async function completeExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
  winner: string | undefined,
  completedBy: string,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ winner, completedBy }),
    },
  );
}

/**
 * Archive an experiment (completed → archived).
 */
export async function archiveExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/archive`,
    {
      method: "POST",
    },
  );
}

/**
 * Delete an experiment (admin only, cannot delete running experiments).
 */
export async function deleteExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
): Promise<void> {
  await browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
    {
      method: "DELETE",
    },
  );
}

/**
 * Get experiment results with statistical analysis.
 */
export async function getExperimentResultsApi(
  platform: string,
  environment: string,
  experimentKey: string,
): Promise<ExperimentResults> {
  return browserApiClient<ExperimentResults>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/results`,
  );
}
