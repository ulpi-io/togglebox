// Main client
export { ToggleBoxClient } from './client'

// Stats reporter
export { StatsReporter } from './stats'

// Errors
export {
  ToggleBoxError,
  NetworkError,
  ValidationError,
  ConfigurationError,
} from './errors'

// Types - SDK specific
export type {
  ClientOptions,
  CacheOptions,
  StatsOptions,
  Config,
  ConfigResponse,
  FlagsResponse,
  ExperimentsResponse,
  ClientEvent,
  EventListener,
  RetryOptions,
  ConversionData,
  EventData,
  HealthCheckResponse,
} from './types'

// Re-export types from packages for SDK consumers

// Tier 2: Feature Flags (2-value model)
export type {
  Flag,
  EvaluationContext as FlagContext,
  EvaluationResult as FlagResult,
  FlagValue,
} from '@togglebox/flags'

// Tier 3: Experiments
export type {
  Experiment,
  ExperimentContext,
  ExperimentVariation,
  VariantAssignment,
} from '@togglebox/experiments'

// Stats
export type { StatsEvent } from '@togglebox/stats'
