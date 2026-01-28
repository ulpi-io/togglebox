// Provider
export { ToggleBoxProvider } from "./provider";

// Hooks (client-side)
export {
  useConfig,
  useFlags,
  useFlag,
  useExperiments,
  useExperiment,
  useAnalytics,
} from "./hooks";

// Types (client)
export type {
  ToggleBoxProviderProps,
  ToggleBoxContextValue,
  ConversionData,
  EventData,
  UseConfigResult,
  UseFlagsResult,
  UseExperimentsResult,
  UseAnalyticsResult,
} from "./types";

// Re-export from sdk for convenience
export { ToggleBoxClient } from "@togglebox/sdk";
export type { ClientOptions, Config } from "@togglebox/sdk";

// Re-export types from packages for convenience
export type { Flag, FlagContext, FlagResult, FlagValue } from "@togglebox/sdk";

export type {
  Experiment,
  ExperimentContext,
  ExperimentVariation,
  VariantAssignment,
} from "@togglebox/sdk";
