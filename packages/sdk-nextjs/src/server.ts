import { ToggleBoxClient } from "@togglebox/sdk";
import type { Flag, EvaluationContext as FlagContext } from "@togglebox/flags";
import { evaluateFlag } from "@togglebox/flags";
import type {
  Experiment,
  ExperimentContext,
  VariantAssignment,
} from "@togglebox/experiments";
import { assignVariation } from "@togglebox/experiments";
import type { ConversionData, EventData, Config } from "./types";

// ============================================================================
// Server Options
// ============================================================================

export interface ServerOptions {
  platform: string;
  environment: string;
  apiUrl: string;
  apiKey?: string; // Required if authentication is enabled
}

// ============================================================================
// Server Result Types (mirror client hook results, minus isLoading/error/refresh)
// ============================================================================

export interface ServerConfigResult {
  config: Config | null;
  getConfigValue: <T>(key: string, defaultValue: T) => T;
}

export interface ServerFlagsResult {
  flags: Flag[];
  /** Synchronously evaluates a flag using the already-fetched flags array (no API call) */
  isFlagEnabled: (flagKey: string, context?: FlagContext) => boolean;
}

/** Single flag result - mirrors useFlag() hook */
export interface ServerFlagResult {
  flag: Flag | null;
  exists: boolean;
  /** Whether the flag is enabled for the given context */
  enabled: boolean;
}

export interface ServerExperimentsResult {
  experiments: Experiment[];
  /** Synchronously assigns a variant using the already-fetched experiments array (no API call) */
  getVariant: (
    experimentKey: string,
    context: ExperimentContext,
  ) => VariantAssignment | null;
}

/** Single experiment result - mirrors useExperiment() hook */
export interface ServerExperimentResult {
  experiment: Experiment | null;
  exists: boolean;
  /** The assigned variant for the given context */
  variant: VariantAssignment | null;
}

export interface ServerAnalyticsResult {
  trackEvent: (
    eventName: string,
    context: ExperimentContext,
    data?: EventData,
  ) => void;
  trackConversion: (
    experimentKey: string,
    context: ExperimentContext,
    data: ConversionData,
  ) => Promise<void>;
  flushStats: () => Promise<void>;
}

// ============================================================================
// Internal: Client Management
// ============================================================================

function createServerClient(options: ServerOptions): ToggleBoxClient {
  return new ToggleBoxClient({
    platform: options.platform,
    environment: options.environment,
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
    cache: { enabled: false, ttl: 0 },
    pollingInterval: 0,
  });
}

// ============================================================================
// Server Functions (same names as client hooks)
// ============================================================================

/**
 * Fetch configuration on the server (Tier 1)
 *
 * @example
 * ```tsx
 * // Server Component
 * import { getConfig } from '@togglebox/sdk-nextjs/server'
 *
 * export default async function Page() {
 *   const { config, getConfigValue } = await getConfig({
 *     platform: 'web',
 *     environment: 'production',
 *     apiUrl: 'https://api.example.com/api/v1',
 *     apiKey: 'tb_live_xxxxx', // Required if authentication is enabled
 *   })
 *
 *   const theme = getConfigValue('theme', 'light')
 *   return <div>Theme: {theme}</div>
 * }
 * ```
 */
export async function getConfig(
  options: ServerOptions,
): Promise<ServerConfigResult> {
  const client = createServerClient(options);

  try {
    const config = await client.getConfig();

    return {
      config,
      getConfigValue: <T>(key: string, defaultValue: T): T => {
        if (!config || !(key in config)) return defaultValue;
        return config[key] as T;
      },
    };
  } catch (error) {
    console.error("Failed to fetch server config:", error);
    return {
      config: null,
      getConfigValue: <T>(_key: string, defaultValue: T): T => defaultValue,
    };
  } finally {
    client.destroy();
  }
}

/**
 * Fetch feature flags on the server (Tier 2)
 *
 * @example
 * ```tsx
 * // Server Component
 * import { getFlags } from '@togglebox/sdk-nextjs/server'
 *
 * export default async function Page() {
 *   const { flags, isFlagEnabled } = await getFlags({
 *     platform: 'web',
 *     environment: 'production',
 *     apiUrl: 'https://api.example.com/api/v1',
 *     apiKey: 'tb_live_xxxxx', // Required if authentication is enabled
 *   })
 *
 *   const showNewFeature = isFlagEnabled('new-feature', { userId: 'user-123' })
 *   return showNewFeature ? <NewFeature /> : <OldFeature />
 * }
 * ```
 */
export async function getFlags(
  options: ServerOptions,
): Promise<ServerFlagsResult> {
  const client = createServerClient(options);

  try {
    const flags = await client.getFlags();

    return {
      flags: flags as unknown as Flag[],
      // Use local evaluation with already-fetched flags (no N+1 API calls)
      isFlagEnabled: (flagKey: string, context?: FlagContext): boolean => {
        const flag = (flags as any[]).find((f: any) => f.flagKey === flagKey);
        if (!flag) return false;
        // Use 'anonymous' as default userId to maintain consistent hashing behavior
        const result = evaluateFlag(flag, context ?? { userId: "anonymous" });
        return result.servedValue === "A";
      },
    };
  } catch (error) {
    console.error("Failed to fetch server flags:", error);
    return {
      flags: [],
      isFlagEnabled: () => false,
    };
  } finally {
    client.destroy();
  }
}

/**
 * Fetch a single feature flag on the server (Tier 2)
 * Mirrors useFlag() hook API
 *
 * @example
 * ```tsx
 * // Server Component
 * import { getFlag } from '@togglebox/sdk-nextjs/server'
 *
 * export default async function Page() {
 *   const { flag, exists, enabled } = await getFlag('dark-mode', { userId: 'user-123' }, {
 *     platform: 'web',
 *     environment: 'production',
 *     apiUrl: 'https://api.example.com/api/v1',
 *     apiKey: 'tb_live_xxxxx', // Required if authentication is enabled
 *   })
 *
 *   return enabled ? <DarkTheme /> : <LightTheme />
 * }
 * ```
 */
export async function getFlag(
  flagKey: string,
  context: FlagContext | undefined,
  options: ServerOptions,
): Promise<ServerFlagResult> {
  const client = createServerClient(options);

  try {
    const flags = await client.getFlags();
    const flag =
      (flags as any[]).find((f: any) => f.flagKey === flagKey) || null;

    let enabled = false;
    if (flag) {
      const result = evaluateFlag(flag, context ?? { userId: "anonymous" });
      enabled = result.servedValue === "A";
    }

    return {
      flag,
      exists: !!flag,
      enabled,
    };
  } catch (error) {
    console.error("Failed to fetch server flag:", error);
    return {
      flag: null,
      exists: false,
      enabled: false,
    };
  } finally {
    client.destroy();
  }
}

/**
 * Fetch a single experiment and assign variant on the server (Tier 3)
 * Mirrors useExperiment() hook API
 *
 * @example
 * ```tsx
 * // Server Component
 * import { getExperiment } from '@togglebox/sdk-nextjs/server'
 *
 * export default async function Page() {
 *   const { experiment, exists, variant } = await getExperiment('cta-test', { userId: 'user-123' }, {
 *     platform: 'web',
 *     environment: 'production',
 *     apiUrl: 'https://api.example.com/api/v1',
 *     apiKey: 'tb_live_xxxxx', // Required if authentication is enabled
 *   })
 *
 *   return variant?.variationKey === 'new-cta' ? <NewCTA /> : <OldCTA />
 * }
 * ```
 */
export async function getExperiment(
  experimentKey: string,
  context: ExperimentContext,
  options: ServerOptions,
): Promise<ServerExperimentResult> {
  const client = createServerClient(options);

  try {
    const experiments = await client.getExperiments();
    const experiment =
      (experiments as any[]).find(
        (e: any) => e.experimentKey === experimentKey,
      ) || null;

    // BUGFIX: Use local assignment to avoid double-counting exposures
    // client.getVariant() tracks an exposure, but the client will also track
    // on hydration, causing inflated exposure counts and distorted conversion rates
    const variant = experiment ? assignVariation(experiment, context) : null;

    return { experiment, exists: !!experiment, variant };
  } catch (error) {
    console.error("Failed to fetch server experiment:", error);
    return { experiment: null, exists: false, variant: null };
  } finally {
    client.destroy();
  }
}

/**
 * Fetch all experiments on the server (Tier 3)
 *
 * @example
 * ```tsx
 * // Server Component
 * import { getExperiments } from '@togglebox/sdk-nextjs/server'
 *
 * export default async function Page() {
 *   const { experiments, getVariant } = await getExperiments({
 *     platform: 'web',
 *     environment: 'production',
 *     apiUrl: 'https://api.example.com/api/v1',
 *     apiKey: 'tb_live_xxxxx', // Required if authentication is enabled
 *   })
 *
 *   const variant = await getVariant('cta-test', { userId: 'user-123' })
 *   return <div>Variant: {variant}</div>
 * }
 * ```
 */
export async function getExperiments(
  options: ServerOptions,
): Promise<ServerExperimentsResult> {
  const client = createServerClient(options);

  try {
    const experiments = await client.getExperiments();

    return {
      experiments: experiments as unknown as Experiment[],
      // Use local assignment with already-fetched experiments (no N+1 API calls)
      getVariant: (
        experimentKey: string,
        context: ExperimentContext,
      ): VariantAssignment | null => {
        const experiment = (experiments as any[]).find(
          (e: any) => e.experimentKey === experimentKey,
        );
        if (!experiment) return null;
        return assignVariation(experiment, context);
      },
    };
  } catch (error) {
    console.error("Failed to fetch server experiments:", error);
    return {
      experiments: [],
      getVariant: () => null,
    };
  } finally {
    client.destroy();
  }
}

/**
 * Get analytics functions for server-side tracking
 * Mirrors useAnalytics() hook API
 *
 * @example
 * ```tsx
 * // Server Action
 * import { getAnalytics } from '@togglebox/sdk-nextjs/server'
 *
 * export async function trackPurchase(userId: string, amount: number) {
 *   const { trackConversion, flushStats } = await getAnalytics({
 *     platform: 'web',
 *     environment: 'production',
 *     apiUrl: 'https://api.example.com/api/v1',
 *     apiKey: 'tb_live_xxxxx', // Required if authentication is enabled
 *   })
 *
 *   await trackConversion('checkout-test', { userId }, { metricId: 'purchase', value: amount })
 *   await flushStats() // Always call flushStats() to send events and cleanup
 * }
 * ```
 */
export async function getAnalytics(
  options: ServerOptions,
): Promise<ServerAnalyticsResult> {
  const client = createServerClient(options);

  return {
    trackEvent: (
      eventName: string,
      context: ExperimentContext,
      data?: EventData,
    ) => {
      (client as any).trackEvent(eventName, context, data);
    },
    trackConversion: async (
      experimentKey: string,
      context: ExperimentContext,
      data: ConversionData,
    ) => {
      await (client as any).trackConversion(experimentKey, context, data);
    },
    flushStats: async () => {
      try {
        await client.flushStats();
      } finally {
        client.destroy();
      }
    },
  };
}
