import { browserApiClient } from "./browser-client";
import type { ConfigParameter, Platform, Environment } from "./types";

/**
 * Get all config parameters across all platforms and environments.
 * Used when no filter is applied.
 */
export async function getAllConfigsApi(): Promise<ConfigParameter[]> {
  // First, get all platforms
  const platforms = await browserApiClient<Platform[]>("/api/v1/platforms");

  // For each platform, get environments and then config parameters
  const allConfigs: ConfigParameter[] = [];

  await Promise.all(
    platforms.map(async (platform) => {
      try {
        const environments = await browserApiClient<Environment[]>(
          `/api/v1/platforms/${platform.name}/environments`,
        );

        await Promise.all(
          environments.map(async (env) => {
            try {
              const params = await browserApiClient<ConfigParameter[]>(
                `/api/v1/platforms/${platform.name}/environments/${env.environment}/configs/list`,
              );
              allConfigs.push(...params);
            } catch {
              // Environment may have no config parameters, skip it
            }
          }),
        );
      } catch {
        // Platform may have no environments, skip it
      }
    }),
  );

  return allConfigs;
}

/**
 * Get all active config parameters for SDK consumption (key-value object).
 */
export async function getConfigsApi(
  platform: string,
  environment: string,
): Promise<Record<string, unknown>> {
  return browserApiClient(
    `/api/v1/platforms/${platform}/environments/${environment}/configs`,
  );
}

/**
 * List all active config parameters with full metadata.
 */
export async function listConfigParametersApi(
  platform: string,
  environment: string,
): Promise<ConfigParameter[]> {
  return browserApiClient(
    `/api/v1/platforms/${platform}/environments/${environment}/configs/list`,
  );
}

/**
 * Get a specific config parameter's active version.
 */
export async function getConfigParameterApi(
  platform: string,
  environment: string,
  parameterKey: string,
): Promise<ConfigParameter> {
  return browserApiClient(
    `/api/v1/platforms/${platform}/environments/${environment}/configs/${parameterKey}`,
  );
}

/**
 * Get all versions of a specific config parameter.
 */
export async function listConfigParameterVersionsApi(
  platform: string,
  environment: string,
  parameterKey: string,
): Promise<ConfigParameter[]> {
  return browserApiClient(
    `/api/v1/platforms/${platform}/environments/${environment}/configs/${parameterKey}/versions`,
  );
}

/**
 * Create a new config parameter (version 1).
 */
export async function createConfigParameterApi(
  platform: string,
  environment: string,
  parameterKey: string,
  valueType: "string" | "number" | "boolean" | "json",
  defaultValue: string,
  options?: {
    description?: string;
    parameterGroup?: string;
  },
): Promise<ConfigParameter> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/configs`,
    {
      method: "POST",
      body: JSON.stringify({
        parameterKey,
        valueType,
        defaultValue,
        description: options?.description,
        parameterGroup: options?.parameterGroup,
      }),
    },
  );
}

/**
 * Update a config parameter (creates new version).
 */
export async function updateConfigParameterApi(
  platform: string,
  environment: string,
  parameterKey: string,
  updates: {
    valueType?: "string" | "number" | "boolean" | "json";
    defaultValue?: string;
    description?: string | null;
    parameterGroup?: string | null;
  },
): Promise<ConfigParameter> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/configs/${parameterKey}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * Delete a config parameter (all versions).
 */
export async function deleteConfigParameterApi(
  platform: string,
  environment: string,
  parameterKey: string,
): Promise<void> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/configs/${parameterKey}`,
    {
      method: "DELETE",
    },
  );
}

/**
 * Rollback a config parameter to a previous version.
 */
export async function rollbackConfigParameterApi(
  platform: string,
  environment: string,
  parameterKey: string,
  version: string,
): Promise<ConfigParameter> {
  return browserApiClient(
    `/api/v1/internal/platforms/${platform}/environments/${environment}/configs/${parameterKey}/rollback`,
    {
      method: "POST",
      body: JSON.stringify({ version }),
    },
  );
}

/**
 * Count active config parameters in an environment.
 */
export async function countConfigParametersApi(
  platform: string,
  environment: string,
): Promise<number> {
  const result = await browserApiClient<{ count: number }>(
    `/api/v1/platforms/${platform}/environments/${environment}/configs/count`,
  );
  return result.count;
}
