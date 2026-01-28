'use client'

import { useMemo } from 'react'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'
import { useToggleBoxContext } from './provider'
import type {
  UseConfigResult,
  UseFlagsResult,
  UseExperimentsResult,
  UseAnalyticsResult,
} from './types'

// ============================================================================
// Tier 1: Remote Configs
// ============================================================================

/**
 * Hook to access configuration (Tier 1)
 *
 * @returns Object with config, getConfigValue, and state
 *
 * @example
 * ```tsx
 * const { config, getConfigValue, isLoading, error, refresh } = useConfig()
 *
 * // Get typed config value with default
 * const apiUrl = await getConfigValue('api_url', 'https://default.api.com')
 * const maxRetries = await getConfigValue<number>('max_retries', 3)
 * ```
 */
export function useConfig(): UseConfigResult {
  const { config, getConfigValue, isLoading, error, refresh } = useToggleBoxContext()
  return { config, getConfigValue, isLoading, error, refresh }
}

// ============================================================================
// Tier 2: Feature Flags
// ============================================================================

/**
 * Hook to access all feature flags (Tier 2)
 *
 * @returns Object with flags, isFlagEnabled, and state
 *
 * @example
 * ```tsx
 * const { flags, isFlagEnabled, isLoading, error, refresh } = useFlags()
 *
 * // Check if a flag is enabled
 * const enabled = await isFlagEnabled('new-checkout', { userId: 'user-123' })
 * ```
 */
export function useFlags(): UseFlagsResult {
  const { flags, isFlagEnabled, isLoading, error, refresh } = useToggleBoxContext()
  return { flags, isFlagEnabled, isLoading, error, refresh }
}

/**
 * Hook to access a single feature flag (Tier 2)
 *
 * @param flagKey - The flag key to check
 * @param context - Optional evaluation context for targeting
 * @returns Object with flag, exists, loading state, and checkEnabled function
 *
 * @example
 * ```tsx
 * const { flag, exists, isLoading, checkEnabled } = useFlag('dark-mode')
 *
 * // Check if enabled for current user
 * const enabled = await checkEnabled()
 * ```
 */
export function useFlag(flagKey: string, context?: FlagContext) {
  const { flags, isLoading, isFlagEnabled } = useToggleBoxContext()

  return useMemo(() => {
    const flag = flags.find((f: Flag) => f.flagKey === flagKey)
    return {
      flag,
      exists: !!flag,
      isLoading,
      checkEnabled: async () => isFlagEnabled(flagKey, context),
    }
  }, [flags, flagKey, isLoading, isFlagEnabled, context])
}

// ============================================================================
// Tier 3: Experiments
// ============================================================================

/**
 * Hook to access all experiments (Tier 3)
 *
 * @returns Object with experiments, getVariant, and state
 *
 * @example
 * ```tsx
 * const { experiments, getVariant, isLoading, error, refresh } = useExperiments()
 *
 * // Get variant for a user
 * const variant = await getVariant('checkout-test', { userId: 'user-123' })
 * ```
 */
export function useExperiments(): UseExperimentsResult {
  const { experiments, getVariant, isLoading, error, refresh } = useToggleBoxContext()
  return { experiments, getVariant, isLoading, error, refresh }
}

/**
 * Hook to access a single experiment (Tier 3)
 *
 * @param experimentKey - The experiment key
 * @param context - Evaluation context for variant assignment
 * @returns Object with experiment, exists, loading state, and getVariant function
 *
 * @example
 * ```tsx
 * const { experiment, exists, isLoading, getVariant } = useExperiment('checkout-test', { userId })
 *
 * // Get assigned variant
 * const variant = await getVariant()
 * ```
 */
export function useExperiment(experimentKey: string, context: ExperimentContext) {
  const { experiments, isLoading, getVariant } = useToggleBoxContext()

  return useMemo(() => {
    const experiment = experiments.find((e: Experiment) => e.experimentKey === experimentKey)
    return {
      experiment,
      exists: !!experiment,
      isLoading,
      getVariant: async () => getVariant(experimentKey, context),
    }
  }, [experiments, experimentKey, isLoading, getVariant, context])
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Hook to access analytics methods
 *
 * @returns Object with trackEvent, trackConversion, and flushStats
 *
 * @example
 * ```tsx
 * const { trackEvent, trackConversion, flushStats } = useAnalytics()
 *
 * // Track a custom event
 * trackEvent('button_clicked', { userId: 'user-123' }, {
 *   properties: { button: 'checkout' }
 * })
 *
 * // Track a conversion
 * await trackConversion('checkout-test', { userId: 'user-123' }, {
 *   metricId: 'purchase',
 *   value: 99.99
 * })
 *
 * // Flush pending events
 * await flushStats()
 * ```
 */
export function useAnalytics(): UseAnalyticsResult {
  const { trackEvent, trackConversion, flushStats } = useToggleBoxContext()
  return { trackEvent, trackConversion, flushStats }
}

