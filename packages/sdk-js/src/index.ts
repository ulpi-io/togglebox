// Main client
export { ToggleBoxClient } from './client'

// Types
export type {
  ClientOptions,
  CacheOptions,
  ConfigResponse,
  FeatureFlagsResponse,
  ClientEvent,
  EventListener,
  RetryOptions,
} from './types'

// Errors
export {
  ToggleBoxError,
  NetworkError,
  ValidationError,
  ConfigurationError,
} from './errors'

// Re-export types from core for convenience
export type {
  Config,
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
  Platform,
  Environment,
  Version,
} from '@togglebox/core'
