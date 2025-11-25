import { useMemo } from 'react'
import { evaluateFeatureFlag } from '@togglebox/core'
import type { Config, EvaluationContext } from '@togglebox/core'
import { useToggleBoxContext } from './provider'

/**
 * Hook to access configuration
 */
export function useToggleBox() {
  return useToggleBoxContext()
}

/**
 * Hook to access configuration object
 */
export function useConfig(): Config | null {
  const { config } = useToggleBoxContext()
  return config
}

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(flagName: string, context?: EvaluationContext) {
  const { featureFlags, isLoading } = useToggleBoxContext()

  const result = useMemo(() => {
    const flag = featureFlags.find(f => f.flagName === flagName)
    if (!flag) {
      return { enabled: false, isLoading }
    }

    const evaluation = evaluateFeatureFlag(flag, context || {})
    return { enabled: evaluation.enabled, isLoading }
  }, [featureFlags, flagName, context, isLoading])

  return result
}

/**
 * Hook to get all evaluated feature flags
 */
export function useFeatureFlags(context?: EvaluationContext) {
  const { featureFlags, isLoading } = useToggleBoxContext()

  const evaluated = useMemo(() => {
    return featureFlags.reduce((acc, flag) => {
      const evaluation = evaluateFeatureFlag(flag, context || {})
      acc[flag.flagName] = evaluation.enabled
      return acc
    }, {} as Record<string, boolean>)
  }, [featureFlags, context])

  return { flags: evaluated, isLoading }
}
