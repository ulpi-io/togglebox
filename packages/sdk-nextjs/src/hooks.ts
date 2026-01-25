'use client'

import { useMemo } from 'react'
import type { Config } from '@togglebox/configs'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'
import { useToggleBoxContext } from './provider'

/**
 * Hook to access full ToggleBox context
 */
export function useToggleBox() {
  return useToggleBoxContext()
}

/**
 * Hook to access configuration object (Tier 1)
 */
export function useConfig(): Config | null {
  const { config } = useToggleBoxContext()
  return config
}

/**
 * Hook to access all feature flags (Tier 2)
 */
export function useFlags(): Flag[] {
  const { flags } = useToggleBoxContext()
  return flags
}

/**
 * Hook to check if a feature flag is enabled (Tier 2)
 *
 * @param flagKey - The flag key to check
 * @param context - Optional evaluation context for targeting
 * @returns Object with enabled state and loading state
 */
export function useFlag(flagKey: string, context?: FlagContext) {
  const { flags, isLoading, isFlagEnabled } = useToggleBoxContext()

  const result = useMemo(() => {
    const flag = flags.find((f: Flag) => f.flagKey === flagKey)
    return { flag, exists: !!flag, isLoading }
  }, [flags, flagKey, isLoading])

  return {
    ...result,
    checkEnabled: async () => isFlagEnabled(flagKey, context),
  }
}

/**
 * Hook to access all experiments (Tier 3)
 */
export function useExperiments(): Experiment[] {
  const { experiments } = useToggleBoxContext()
  return experiments
}

/**
 * Hook to get experiment variant (Tier 3)
 *
 * @param experimentKey - The experiment key
 * @param context - Evaluation context for variant assignment
 * @returns Object with variant info and loading state
 */
export function useExperiment(experimentKey: string, context: ExperimentContext) {
  const { experiments, isLoading, getVariant } = useToggleBoxContext()

  const experiment = useMemo(() => {
    return experiments.find((e: Experiment) => e.experimentKey === experimentKey)
  }, [experiments, experimentKey])

  return {
    experiment,
    exists: !!experiment,
    isLoading,
    getVariant: async () => getVariant(experimentKey, context),
  }
}
