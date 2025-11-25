'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk'
import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'
import type { ToggleBoxProviderProps, ToggleBoxContextValue } from './types'

const ToggleBoxContext = createContext<ToggleBoxContextValue | null>(null)

/**
 * Provider component for ToggleBox configuration
 */
export function ToggleBoxProvider({
  platform,
  environment,
  apiUrl,
  tenantSubdomain,
  cache,
  pollingInterval = 0,
  initialConfig,
  initialFlags,
  children,
}: ToggleBoxProviderProps) {
  const [config, setConfig] = useState<Config | null>(initialConfig || null)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(initialFlags || [])
  const [isLoading, setIsLoading] = useState(!initialConfig)
  const [error, setError] = useState<Error | null>(null)

  const clientRef = useRef<ToggleBoxClient | null>(null)

  // Initialize client
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
    client.on('update', ({ config: newConfig, flags: newFlags }) => {
      setConfig(newConfig)
      setFeatureFlags(newFlags)
    })

    client.on('error', (err) => {
      setError(err)
    })

    // Initial fetch if no initial data
    if (!initialConfig) {
      Promise.all([
        client.getConfig(),
        client.getFeatureFlags(),
      ])
        .then(([configData, flagsData]) => {
          setConfig(configData)
          setFeatureFlags(flagsData)
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
  }, [platform, environment, apiUrl, tenantSubdomain, pollingInterval, initialConfig])

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
