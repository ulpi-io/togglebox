import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'

/**
 * Provider configuration options
 */
export interface ToggleBoxProviderProps {
  /** Platform name */
  platform: string

  /** Environment name */
  environment: string

  /**
   * API base URL (for open source self-hosted)
   * @remarks Use tenantSubdomain for cloud deployments
   */
  apiUrl?: string

  /**
   * Tenant subdomain for cloud deployments
   * @remarks Automatically constructs apiUrl as https://{tenantSubdomain}.togglebox.io
   * @example 'acme' → https://acme.togglebox.io
   */
  tenantSubdomain?: string

  /** Cache configuration */
  cache?: {
    enabled: boolean
    ttl: number
  }

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Initial config for SSR hydration */
  initialConfig?: Config

  /** Initial feature flags for SSR hydration */
  initialFlags?: FeatureFlag[]

  /** Children components */
  children: React.ReactNode
}

/**
 * Context value provided to components
 */
export interface ToggleBoxContextValue {
  /** Current configuration */
  config: Config | null

  /** Current feature flags */
  featureFlags: FeatureFlag[]

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh config and flags */
  refresh: () => Promise<void>

  /** Check if a flag is enabled */
  isEnabled: (flagName: string, context?: EvaluationContext) => Promise<boolean>

  /** Set global evaluation context */
  setContext: (context: EvaluationContext) => void
}
