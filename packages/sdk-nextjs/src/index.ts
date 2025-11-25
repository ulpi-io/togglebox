// Provider and hooks
export { ToggleBoxProvider } from './provider'
export { useToggleBox, useConfig, useFeatureFlag, useFeatureFlags } from './hooks'

// Server-side helpers
export { getServerSideConfig, getStaticConfig } from './server'

// Types
export type { ToggleBoxProviderProps, ToggleBoxContextValue } from './types'

// Re-export from sdk for convenience
export { ToggleBoxClient } from '@togglebox/sdk'
export type {
  ClientOptions,
  Config,
  FeatureFlag,
  EvaluationContext,
} from '@togglebox/sdk'
