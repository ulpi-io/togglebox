// Provider and context
export { ToggleBoxProvider, useToggleBoxContext } from './provider'

// Hooks
export {
  useToggleBox,
  useConfig,
  useFlags,
  useFlag,
  useExperiments,
  useExperiment,
} from './hooks'

// Server-side helpers
export { getServerSideConfig, getStaticConfig } from './server'

// Types
export type {
  ToggleBoxProviderProps,
  ToggleBoxContextValue,
  ConversionData,
  EventData,
} from './types'

// Re-export from sdk for convenience
export { ToggleBoxClient } from '@togglebox/sdk'
export type { ClientOptions, Config } from '@togglebox/sdk'

// Re-export types from packages for convenience
export type {
  Flag,
  FlagContext,
  FlagResult,
  FlagValue,
} from '@togglebox/sdk'

export type {
  Experiment,
  ExperimentContext,
  ExperimentVariation,
  VariantAssignment,
} from '@togglebox/sdk'
