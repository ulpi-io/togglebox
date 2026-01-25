import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk'
import { Storage } from './storage'
import type { Config } from '@togglebox/configs'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'
import type { ToggleBoxProviderProps, ToggleBoxContextValue } from './types'

const ToggleBoxContext = createContext<ToggleBoxContextValue | null>(null)

/**
 * Provider component for ToggleBox three-tier architecture with MMKV offline support.
 *
 * Provides access to:
 * - Tier 1: Remote Configs (same value for all users)
 * - Tier 2: Feature Flags (2-value model with targeting)
 * - Tier 3: Experiments (multi-variant A/B testing)
 *
 * @remarks
 * Uses react-native-mmkv for high-performance persistent storage.
 * MMKV is significantly faster and more reliable than AsyncStorage.
 *
 * @example
 * ```tsx
 * <ToggleBoxProvider
 *   platform="mobile"
 *   environment="production"
 *   tenantSubdomain="acme"
 *   persistToStorage={true}
 *   storageTTL={86400000} // 24 hours
 * >
 *   <App />
 * </ToggleBoxProvider>
 * ```
 */
export function ToggleBoxProvider({
  platform,
  environment,
  apiUrl,
  tenantSubdomain,
  cache,
  pollingInterval = 0,
  configVersion,
  persistToStorage = false,
  storageTTL = 86400000, // 24 hours default
  children,
}: ToggleBoxProviderProps) {
  // Tier 1: Remote Configs
  const [config, setConfig] = useState<Config | null>(null)
  // Tier 2: Feature Flags (2-value model)
  const [flags, setFlags] = useState<Flag[]>([])
  // Tier 3: Experiments
  const [experiments, setExperiments] = useState<Experiment[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const clientRef = useRef<ToggleBoxClient | null>(null)
  const storageRef = useRef<Storage | null>(null)

  // Initialize storage if enabled
  useEffect(() => {
    if (persistToStorage) {
      storageRef.current = new Storage(platform, environment, storageTTL)
    }
  }, [platform, environment, persistToStorage, storageTTL])

  // Initialize client and load data
  useEffect(() => {
    const client = new ToggleBoxClient({
      platform,
      environment,
      apiUrl,
      tenantSubdomain,
      cache,
      pollingInterval,
      configVersion,
    })

    clientRef.current = client

    // Listen for updates from polling
    client.on('update', async (data) => {
      const updateData = data as {
        config: Config
        flags: Flag[]
        experiments: Experiment[]
      }
      setConfig(updateData.config)
      setFlags(updateData.flags)
      setExperiments(updateData.experiments)

      // Save to MMKV if enabled
      if (persistToStorage && storageRef.current) {
        await storageRef.current.save(updateData.config, updateData.flags, updateData.experiments)
      }
    })

    client.on('error', (err) => {
      setError(err as Error)
    })

    // Load initial data
    const loadData = async () => {
      try {
        // Try loading from MMKV first
        if (persistToStorage && storageRef.current) {
          const stored = await storageRef.current.load()
          if (stored) {
            setConfig(stored.config)
            setFlags(stored.flags)
            setExperiments(stored.experiments)
            setIsLoading(false)

            // Fetch fresh data in background
            client.refresh().catch(console.error)
            return
          }
        }

        // Fetch from API
        const [configData, flagsData, experimentsData] = await Promise.all([
          client.getConfig(),
          client.getFlags(),
          client.getExperiments(),
        ])

        setConfig(configData)
        setFlags(flagsData)
        setExperiments(experimentsData)
        setError(null)

        // Save to MMKV if enabled
        if (persistToStorage && storageRef.current) {
          await storageRef.current.save(configData, flagsData, experimentsData)
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      client.destroy()
    }
  }, [platform, environment, apiUrl, tenantSubdomain, pollingInterval, configVersion, persistToStorage])

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

  const value: ToggleBoxContextValue = {
    config,
    flags,
    experiments,
    isLoading,
    error,
    refresh,
    isFlagEnabled,
    getVariant,
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
