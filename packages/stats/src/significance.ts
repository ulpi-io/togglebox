/**
 * @togglebox/stats - Statistical Significance Calculations
 *
 * Frequentist statistical analysis for A/B testing.
 * Provides p-values, confidence intervals, and relative lift calculations.
 */

/**
 * Variation data for statistical calculations.
 */
export interface VariationData {
  variationKey: string;
  participants: number;
  conversions: number;
}

/**
 * Result of significance calculation.
 */
export interface SignificanceResult {
  pValue: number;
  isSignificant: boolean;
  zScore: number;
  confidenceInterval: [number, number];
  relativeLift: number;
  controlConversionRate: number;
  treatmentConversionRate: number;
}

/**
 * Standard normal cumulative distribution function (CDF).
 * Uses the Abramowitz and Stegun approximation.
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate the z-score for the difference between two proportions.
 */
function calculateZScore(
  p1: number,
  n1: number,
  p2: number,
  n2: number,
): number {
  // Pooled proportion
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  // Avoid division by zero
  if (se === 0) return 0;

  return (p2 - p1) / se;
}

/**
 * Calculate confidence interval for a proportion.
 */
function calculateConfidenceInterval(
  p: number,
  n: number,
  confidenceLevel: number,
): [number, number] {
  // Z-score for confidence level (e.g., 1.96 for 95%)
  const zCritical = getZCritical(confidenceLevel);

  // Standard error for proportion
  const se = Math.sqrt((p * (1 - p)) / n);

  // Confidence interval
  const margin = zCritical * se;

  return [Math.max(0, p - margin), Math.min(1, p + margin)];
}

/**
 * Get z-critical value for a given confidence level.
 */
function getZCritical(confidenceLevel: number): number {
  // Common values
  if (confidenceLevel === 0.9) return 1.645;
  if (confidenceLevel === 0.95) return 1.96;
  if (confidenceLevel === 0.99) return 2.576;

  // Approximate for other values using inverse normal
  // This is a simplified approximation
  const alpha = 1 - confidenceLevel;
  return -Math.sqrt(2) * erfInv(alpha - 1);
}

/**
 * Inverse error function approximation.
 */
function erfInv(x: number): number {
  const a = 0.147;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const ln = Math.log(1 - x * x);
  const term1 = 2 / (Math.PI * a) + ln / 2;
  const term2 = ln / a;

  return sign * Math.sqrt(Math.sqrt(term1 * term1 - term2) - term1);
}

/**
 * Calculate statistical significance for conversion rate comparison.
 *
 * @param control - Control variation data
 * @param treatment - Treatment variation data
 * @param confidenceLevel - Desired confidence level (default: 0.95)
 * @returns Significance result with p-value, confidence interval, and lift
 *
 * @remarks
 * Uses a two-proportion z-test (two-tailed) for conversion metrics.
 * The test compares the conversion rates of control vs treatment.
 *
 * @example
 * ```ts
 * const control = { variationKey: 'control', participants: 1000, conversions: 100 };
 * const treatment = { variationKey: 'treatment', participants: 1000, conversions: 120 };
 *
 * const result = calculateSignificance(control, treatment);
 * // result.isSignificant: true if p < 0.05
 * // result.relativeLift: 0.20 (20% lift)
 * ```
 */
export function calculateSignificance(
  control: VariationData,
  treatment: VariationData,
  confidenceLevel = 0.95,
): SignificanceResult {
  // SECURITY: Guard against division by zero when there are no participants
  if (control.participants === 0 || treatment.participants === 0) {
    return {
      pValue: 1,
      isSignificant: false,
      zScore: 0,
      confidenceInterval: [0, 0],
      relativeLift: 0,
      controlConversionRate: 0,
      treatmentConversionRate: 0,
    };
  }

  // Calculate conversion rates
  const p1 = control.conversions / control.participants;
  const p2 = treatment.conversions / treatment.participants;

  // Calculate z-score
  const zScore = calculateZScore(
    p1,
    control.participants,
    p2,
    treatment.participants,
  );

  // Calculate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Calculate confidence interval for treatment
  const confidenceInterval = calculateConfidenceInterval(
    p2,
    treatment.participants,
    confidenceLevel,
  );

  // Calculate relative lift
  const relativeLift = p1 > 0 ? (p2 - p1) / p1 : 0;

  return {
    pValue,
    isSignificant: pValue < 1 - confidenceLevel,
    zScore,
    confidenceInterval,
    relativeLift,
    controlConversionRate: p1,
    treatmentConversionRate: p2,
  };
}

/**
 * Calculate significance for multiple treatments vs control.
 *
 * @param control - Control variation data
 * @param treatments - Array of treatment variation data
 * @param confidenceLevel - Desired confidence level
 * @returns Map of variation key to significance result
 */
export function calculateMultipleSignificance(
  control: VariationData,
  treatments: VariationData[],
  confidenceLevel = 0.95,
): Map<string, SignificanceResult> {
  const results = new Map<string, SignificanceResult>();

  for (const treatment of treatments) {
    results.set(
      treatment.variationKey,
      calculateSignificance(control, treatment, confidenceLevel),
    );
  }

  return results;
}

/**
 * Calculate required sample size for desired statistical power.
 *
 * @param baselineConversion - Expected baseline conversion rate (0-1)
 * @param minimumDetectableEffect - Minimum effect size to detect (relative, e.g., 0.1 for 10%)
 * @param confidenceLevel - Desired confidence level (default: 0.95)
 * @param power - Desired statistical power (default: 0.8)
 * @returns Required sample size per variation
 *
 * @example
 * ```ts
 * // 5% baseline conversion, want to detect 10% relative lift
 * const sampleSize = calculateRequiredSampleSize(0.05, 0.1);
 * // Returns ~31,000 per variation
 * ```
 */
export function calculateRequiredSampleSize(
  baselineConversion: number,
  minimumDetectableEffect: number,
  confidenceLevel = 0.95,
  power = 0.8,
): number {
  // SECURITY: Validate inputs to prevent division by zero and invalid calculations
  if (baselineConversion <= 0 || baselineConversion >= 1) {
    throw new Error("baselineConversion must be between 0 and 1 (exclusive)");
  }
  if (minimumDetectableEffect <= 0) {
    throw new Error("minimumDetectableEffect must be greater than 0");
  }
  if (confidenceLevel <= 0 || confidenceLevel >= 1) {
    throw new Error("confidenceLevel must be between 0 and 1 (exclusive)");
  }
  if (power <= 0 || power >= 1) {
    throw new Error("power must be between 0 and 1 (exclusive)");
  }

  const zAlpha = getZCritical(confidenceLevel);
  const zBeta = getZCritical(power);

  const p1 = baselineConversion;
  const p2 = baselineConversion * (1 + minimumDetectableEffect);

  const pooledP = (p1 + p2) / 2;

  const numerator = 2 * pooledP * (1 - pooledP) * Math.pow(zAlpha + zBeta, 2);
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
}
