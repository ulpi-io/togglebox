/**
 * @togglebox/stats
 *
 * Statistics and metrics for all three tiers:
 * - Remote Configs: fetch counts, unique clients
 * - Feature Flags: evaluation counts per value, country breakdown
 * - Experiments: exposures, conversions, statistical analysis
 *
 * Features:
 * - Frequentist statistical significance (p-values, confidence intervals)
 * - Sample Ratio Mismatch (SRM) detection
 * - Event batching for efficient SDK-to-API communication
 * - Repository interface for multi-database support
 */

// Export types
export * from "./types";

// Export statistical calculations
export * from "./significance";
export * from "./srm";

// Export repository interface
export * from "./repository";

// Export collector for SDK use
export * from "./collector";
