import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk'
import { Storage } from './storage'
import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'
import type { ToggleBoxProviderProps, ToggleBoxContextValue } from './types'

const ToggleBoxContext = createContext<ToggleBoxContextValue | null>(null)

/**
 * Provider component for ToggleBox configuration with AsyncStorage support
 */
export function ToggleBoxProvider({
  platform,
  environment,
  apiUrl,
  tenantSubdomain,
  cache,
  pollingInterval = 0,
  persistToStorage = false,
  storageTTL = 86400000, // 24 hours default
  children,
}: ToggleBoxProviderProps) {
  const [config, setConfig] = useState<Config | null>(null)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
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
    })

    clientRef.current = client

    // Listen for updates from polling
    client.on('update', async ({ config: newConfig, flags: newFlags }) => {
      setConfig(newConfig)
      setFeatureFlags(newFlags)

      // Save to AsyncStorage if enabled
      if (persistToStorage && storageRef.current) {
        await storageRef.current.save(newConfig, newFlags)
      }
    })

    client.on('error', (err) => {
      setError(err)
    })

    // Load initial data
    const loadData = async () => {
      try {
        // Try loading from AsyncStorage first
        if (persistToStorage && storageRef.current) {
          const stored = await storageRef.current.load()
          if (stored) {
            setConfig(stored.config)
            setFeatureFlags(stored.flags)
            setIsLoading(false)

            // Fetch fresh data in background
            client.refresh().catch(console.error)
            return
          }
        }

        // Fetch from API
        const [configData, flagsData] = await Promise.all([
          client.getConfig(),
          client.getFeatureFlags(),
        ])

        setConfig(configData)
        setFeatureFlags(flagsData)
        setError(null)

        // Save to AsyncStorage if enabled
        if (persistToStorage && storageRef.current) {
          await storageRef.current.save(configData, flagsData)
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
  }, [platform, environment, apiUrl, tenantSubdomain, pollingInterval, persistToStorage])

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

  const isEnabled = useCallback(async (flagName: string, context?: EvaluationContext) => {
    if (!clientRef.current) return false
    return clientRef.current.isEnabled(flagName, context)
  }, [])

  const setContext = useCallback((context: EvaluationContext) => {
    if (!clientRef.current) return
    clientRef.current.setContext(context)
  }, [])

  const value: ToggleBoxContextValue = {
    config,
    featureFlags,
    isLoading,
    error,
    refresh,
    isEnabled,
    setContext,
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
