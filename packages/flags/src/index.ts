/**
 * @togglebox/flags
 *
 * Feature Flags - 2-value feature control with geographic targeting
 * and percentage-based rollout.
 *
 * For multi-variant testing (3+ variants), use @togglebox/experiments instead.
 *
 * Key Characteristics:
 * - Exactly 2 values (valueA and valueB)
 * - Geographic targeting (Country → Language hierarchy)
 * - Force include/exclude user lists
 * - Percentage-based rollout with deterministic hashing
 * - Simple boolean, string, or number values
 *
 * Use Cases:
 * - Kill switches (on/off)
 * - Feature toggles (enabled/disabled)
 * - Version switches ("v1"/"v2")
 * - Theme toggles ("light"/"dark")
 * - Beta access by country/language
 * - Gradual rollouts (10% → 50% → 100%)
 */

// Export schemas and types
export * from "./schemas";

// Export evaluator
export * from "./evaluator";

// Export repository interface
export * from "./repository";
