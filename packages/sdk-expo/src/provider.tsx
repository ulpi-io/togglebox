import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk'
import { Storage } from './storage'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'
import type { ToggleBoxProviderProps, ToggleBoxContextValue, ConversionData, EventData, Config } from './types'

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
  apiKey,
  tenantSubdomain,
  cache,
  pollingInterval = 0,
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
      apiKey,
      tenantSubdomain,
      cache,
      pollingInterval,
    })

    clientRef.current = client

    // BUGFIX: Track mounted state to prevent state updates after unmount
    let isMounted = true

    // Event handlers (extracted for proper cleanup)
    const handleUpdate = (data: unknown) => {
      if (!isMounted) return
      try {
        const updateData = data as {
          config: Config
          flags: Flag[]
          experiments: Experiment[]
        }
        setConfig(updateData.config)
        setFlags(updateData.flags)
        setExperiments(updateData.experiments)

        // Save to MMKV if enabled - use void to indicate intentional fire-and-forget
        if (persistToStorage && storageRef.current) {
          void storageRef.current
            .save(updateData.config, updateData.flags, updateData.experiments)
            .catch((err) => {
              if (isMounted) setError(err as Error)
            })
        }
      } catch (err) {
        if (isMounted) setError(err as Error)
      }
    }

    const handleError = (err: unknown) => {
      if (isMounted) setError(err as Error)
    }

    // Listen for updates from polling
    client.on('update', handleUpdate)
    client.on('error', handleError)

    // Load initial data
    const loadData = async () => {
      try {
        // Try loading from MMKV first
        if (persistToStorage && storageRef.current) {
          const stored = await storageRef.current.load()
          if (stored) {
            if (isMounted) {
              setConfig(stored.config)
              setFlags(stored.flags)
              setExperiments(stored.experiments)
              setIsLoading(false)
            }

            // Fetch fresh data in background
            client
              .refresh()
              .then(() => {
                if (isMounted) setError(null)
              })
              .catch((err) => {
                if (isMounted) setError(err as Error)
              })
            return
          }
        }

        // Fetch from API
        const [configData, flagsData, experimentsData] = await Promise.all([
          client.getConfig(),
          client.getFlags(),
          client.getExperiments(),
        ])

        if (isMounted) {
          setConfig(configData)
          setFlags(flagsData)
          setExperiments(experimentsData)
          setError(null)
        }

        // Save to MMKV if enabled
        if (persistToStorage && storageRef.current) {
          await storageRef.current.save(configData, flagsData, experimentsData)
        }
      } catch (err) {
        if (isMounted) setError(err as Error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
      // Explicitly remove event listeners before destroying
      client.off('update', handleUpdate)
      client.off('error', handleError)
      client.destroy()
    }
  }, [platform, environment, apiUrl, apiKey, tenantSubdomain, cache, pollingInterval, persistToStorage, storageTTL])

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
