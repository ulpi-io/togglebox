/**
 * @togglebox/experiments
 *
 * Experiments - A/B testing with multiple variants and statistical analysis.
 *
 * Key Characteristics:
 * - 2+ variations (control + treatments)
 * - Traffic allocation control
 * - Metrics tracking (conversion, count, sum, average)
 * - Statistical significance with p-values and confidence intervals
 * - Sample Ratio Mismatch (SRM) detection
 * - Lifecycle management (draft → running → completed)
 *
 * Use Cases:
 * - Conversion rate optimization (A/B/C/D testing)
 * - Revenue impact testing
 * - UX/UI comparisons
 * - Algorithm testing
 * - Pricing experiments
 */

// Export schemas and types
export * from './schemas';

// Export evaluator
export * from './evaluator';

// Export repository interface
export * from './repository';
