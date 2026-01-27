'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk'
import type { Config } from '@togglebox/configs'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'
import type { ToggleBoxProviderProps, ToggleBoxContextValue, ConversionData, EventData } from './types'

const ToggleBoxContext = createContext<ToggleBoxContextValue | null>(null)

/**
 * Provider component for ToggleBox three-tier architecture.
 *
 * Provides access to:
 * - Tier 1: Remote Configs (same value for all users)
 * - Tier 2: Feature Flags (2-value model with targeting)
 * - Tier 3: Experiments (multi-variant A/B testing)
 */
export function ToggleBoxProvider({
  platform,
  environment,
  apiUrl,
  apiKey,
  tenantSubdomain,
  cache,
  pollingInterval = 0,
  configVersion,
  initialConfig,
  initialFlags,
  initialExperiments,
  children,
}: ToggleBoxProviderProps) {
  // Tier 1: Remote Configs
  const [config, setConfig] = useState<Config | null>(initialConfig || null)
  // Tier 2: Feature Flags (2-value model)
  const [flags, setFlags] = useState<Flag[]>(initialFlags || [])
  // Tier 3: Experiments
  const [experiments, setExperiments] = useState<Experiment[]>(initialExperiments || [])

  const [isLoading, setIsLoading] = useState(!initialConfig)
  const [error, setError] = useState<Error | null>(null)

  const clientRef = useRef<ToggleBoxClient | null>(null)

  // Initialize client
  useEffect(() => {
    const client = new ToggleBoxClient({
      platform,
      environment,
      apiUrl,
      apiKey,
      tenantSubdomain,
      cache,
      pollingInterval,
      configVersion,
    })

    clientRef.current = client

    // Listen for updates from polling
    client.on('update', (data) => {
      const updateData = data as {
        config: Config
        flags: Flag[]
        experiments: Experiment[]
      }
      setConfig(updateData.config)
      setFlags(updateData.flags)
      setExperiments(updateData.experiments)
    })

    client.on('error', (err) => {
      setError(err as Error)
    })

    // Initial fetch if no initial data
    if (!initialConfig) {
      Promise.all([
        client.getConfig(),
        client.getFlags(),
        client.getExperiments(),
      ])
        .then(([configData, flagsData, experimentsData]) => {
          setConfig(configData)
          setFlags(flagsData)
          setExperiments(experimentsData)
          setError(null)
        })
        .catch((err) => {
          setError(err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }

    return () => {
      client.destroy()
    }
  }, [platform, environment, apiUrl, apiKey, tenantSubdomain, pollingInterval, configVersion, initialConfig])

  const refresh = useCallback(async () => {
    if (!clientRef.current) return

    setIsLoading(true)
    try {
      await clientRef.current.refresh()
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const isFlagEnabled = useCallback(async (flagKey: string, context?: FlagContext) => {
    if (!clientRef.current) return false
    return clientRef.current.isFlagEnabled(flagKey, context ?? { userId: 'anonymous' })
  }, [])

  const getVariant = useCallback(async (experimentKey: string, context: ExperimentContext) => {
    if (!clientRef.current) return null
    const result = await clientRef.current.getVariant(experimentKey, context)
    return result?.variationKey ?? null
  }, [])

  const trackConversion = useCallback(
    async (experimentKey: string, context: ExperimentContext, data: ConversionData) => {
      if (!clientRef.current) return
      await clientRef.current.trackConversion(experimentKey, context, data)
    },
    []
  )

  const trackEvent = useCallback(
    (eventName: string, context: ExperimentContext, data?: EventData) => {
      if (!clientRef.current) return
      clientRef.current.trackEvent(eventName, context, data)
    },
    []
  )

  const getConfigValue = useCallback(async <T,>(key: string, defaultValue: T): Promise<T> => {
    if (!clientRef.current) return defaultValue
    return clientRef.current.getConfigValue(key, defaultValue)
  }, [])

  const flushStats = useCallback(async () => {
    if (!clientRef.current) return
    await clientRef.current.flushStats()
  }, [])

  const getClient = useCallback(() => clientRef.current, [])

  const value: ToggleBoxContextValue = {
    config,
    flags,
    experiments,
    isLoading,
    error,
    refresh,
    isFlagEnabled,
    getVariant,
    trackConversion,
    trackEvent,
    getConfigValue,
    flushStats,
    getClient,
  }

  return (
    <ToggleBoxContext.Provider value={value}>
      {children}
    </ToggleBoxContext.Provider>
  )
}

/**
 * Hook to access ToggleBox context
 */
export function useToggleBoxContext(): ToggleBoxContextValue {
  const context = useContext(ToggleBoxContext)
  if (!context) {
    throw new Error('useToggleBoxContext must be used within ToggleBoxProvider')
  }
  return context
}
