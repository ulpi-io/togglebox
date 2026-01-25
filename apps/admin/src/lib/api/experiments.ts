import { browserApiClient } from './browser-client';
import type { Experiment, ExperimentResults } from './types';

/**
 * Get all experiments for an environment.
 * Three-Tier Architecture - Tier 3: Experiments (A/B testing)
 */
export async function getExperimentsApi(
  platform: string,
  environment: string,
  status?: 'draft' | 'running' | 'paused' | 'completed' | 'archived'
): Promise<Experiment[]> {
  const queryParams = status ? `?status=${status}` : '';
  return browserApiClient<Experiment[]>(
    `/api/v1/platforms/${platform}/environments/${environment}/experiments${queryParams}`
  );
}

/**
 * Get a specific experiment.
 */
export async function getExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`
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
      metricType: 'conversion' | 'count' | 'sum' | 'average';
      successDirection: 'increase' | 'decrease';
      valueProperty?: string;
    };
    secondaryMetrics?: Array<{
      id: string;
      name: string;
      eventName: string;
      metricType: 'conversion' | 'count' | 'sum' | 'average';
      successDirection: 'increase' | 'decrease';
      valueProperty?: string;
    }>;
    confidenceLevel?: number;
    minimumDetectableEffect?: number;
    minimumSampleSize?: number;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
  }
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
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
      metricType: 'conversion' | 'count' | 'sum' | 'average';
      successDirection: 'increase' | 'decrease';
      valueProperty?: string;
    };
    secondaryMetrics?: Array<{
      id: string;
      name: string;
      eventName: string;
      metricType: 'conversion' | 'count' | 'sum' | 'average';
      successDirection: 'increase' | 'decrease';
      valueProperty?: string;
    }>;
    confidenceLevel?: number;
    minimumDetectableEffect?: number;
    minimumSampleSize?: number;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
  }
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Start an experiment (draft → running).
 */
export async function startExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string,
  startedBy: string
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/start`,
    {
      method: 'POST',
      body: JSON.stringify({ startedBy }),
    }
  );
}

/**
 * Pause an experiment (running → paused).
 */
export async function pauseExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/pause`,
    {
      method: 'POST',
    }
  );
}

/**
 * Resume an experiment (paused → running).
 */
export async function resumeExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/resume`,
    {
      method: 'POST',
    }
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
  completedBy: string
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ winner, completedBy }),
    }
  );
}

/**
 * Archive an experiment (completed → archived).
 */
export async function archiveExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<Experiment> {
  return browserApiClient<Experiment>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/archive`,
    {
      method: 'POST',
    }
  );
}

/**
 * Delete an experiment (admin only, cannot delete running experiments).
 */
export async function deleteExperimentApi(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<void> {
  await browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Get experiment results with statistical analysis.
 */
export async function getExperimentResultsApi(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<ExperimentResults> {
  return browserApiClient<ExperimentResults>(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/results`
  );
}
