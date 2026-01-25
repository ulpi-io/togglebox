import type { Config } from '@togglebox/configs'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'

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

  /**
   * Config version to fetch (default: 'stable')
   * @remarks
   * - 'stable': Latest stable version (default)
   * - 'latest': Latest version (may be unstable)
   * - '1.2.3': Specific version label
   */
  configVersion?: string

  /** Initial config for SSR hydration */
  initialConfig?: Config

  /** Initial feature flags (2-value model) for SSR hydration */
  initialFlags?: Flag[]

  /** Initial experiments for SSR hydration */
  initialExperiments?: Experiment[]

  /** Children components */
  children: React.ReactNode
}

/**
 * Context value provided to components
 */
export interface ToggleBoxContextValue {
  /** Current configuration (Tier 1) */
  config: Config | null

  /** Current feature flags - 2-value model (Tier 2) */
  flags: Flag[]

  /** Current experiments (Tier 3) */
  experiments: Experiment[]

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh config, flags, and experiments */
  refresh: () => Promise<void>

  /** Check if a flag is enabled */
  isFlagEnabled: (flagKey: string, context?: FlagContext) => Promise<boolean>

  /** Get experiment variant for a user */
  getVariant: (experimentKey: string, context: ExperimentContext) => Promise<string | null>
}
