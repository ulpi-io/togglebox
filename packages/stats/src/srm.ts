/**
 * @togglebox/stats - Sample Ratio Mismatch Detection
 *
 * Detects when actual traffic allocation differs significantly from expected.
 * SRM indicates a problem with the experiment setup or data collection.
 */

import type { VariationData } from './significance';

/**
 * Result of SRM check.
 */
export interface SRMResult {
  hasMismatch: boolean;
  pValue: number;
  expectedRatios: number[];
  observedRatios: number[];
  chiSquared: number;
  warning?: string;
}

/**
 * Chi-squared cumulative distribution function.
 * Uses the incomplete gamma function approximation.
 */
function chiSquaredCDF(x: number, degreesOfFreedom: number): number {
  if (x <= 0) return 0;

  // Use incomplete gamma function: P(df/2, x/2)
  return gammainc(degreesOfFreedom / 2, x / 2);
}

/**
 * Lower incomplete gamma function approximation.
 * Uses a series expansion for small x and continued fraction for large x.
 */
function gammainc(a: number, x: number): number {
  const EPSILON = 1e-10;
  const MAX_ITERATIONS = 100;

  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;

  // Use series expansion for x < a + 1
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;

    for (let n = 1; n < MAX_ITERATIONS; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < EPSILON) break;
    }

    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  // Use continued fraction for x >= a + 1
  let b = x + 1 - a;
  let c = 1 / EPSILON;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i < MAX_ITERATIONS; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < EPSILON) d = EPSILON;
    c = b + an / c;
    if (Math.abs(c) < EPSILON) c = EPSILON;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPSILON) break;
  }

  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/**
 * Log gamma function approximation (Stirling's).
 */
function logGamma(x: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953,
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);

  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    const coef = coefficients[j];
    if (coef !== undefined) {
      ser += coef / ++y;
    }
  }

  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/**
 * Check for Sample Ratio Mismatch in an experiment.
 *
 * @param variations - Array of variation data with participant counts
 * @param expectedRatios - Expected traffic allocation ratios (must sum to 1)
 * @param threshold - P-value threshold for flagging mismatch (default: 0.01)
 * @returns SRM check result
 *
 * @remarks
 * Uses a chi-squared goodness-of-fit test to compare observed vs expected ratios.
 * A very strict threshold (0.01) is used because SRM is a serious problem.
 *
 * Common causes of SRM:
 * - Bugs in assignment logic
 * - Bot traffic affecting some variations
 * - Data collection issues
 * - Redirect timing differences
 *
 * @example
 * ```ts
 * const variations = [
 *   { variationKey: 'control', participants: 5100, conversions: 510 },
 *   { variationKey: 'treatment', participants: 4900, conversions: 539 },
 * ];
 *
 * const result = checkSRM(variations, [0.5, 0.5]);
 * // If hasMismatch is true, investigate before trusting results
 * ```
 */
export function checkSRM(
  variations: VariationData[],
  expectedRatios: number[],
  threshold = 0.01
): SRMResult {
  // Validate inputs
  if (variations.length !== expectedRatios.length) {
    throw new Error('Variations and expected ratios must have same length');
  }

  const ratioSum = expectedRatios.reduce((a, b) => a + b, 0);
  if (Math.abs(ratioSum - 1) > 0.001) {
    throw new Error('Expected ratios must sum to 1');
  }

  // Calculate totals
  const totalParticipants = variations.reduce((sum, v) => sum + v.participants, 0);

  if (totalParticipants === 0) {
    return {
      hasMismatch: false,
      pValue: 1,
      expectedRatios,
      observedRatios: expectedRatios.map(() => 0),
      chiSquared: 0,
      warning: 'No participants to analyze',
    };
  }

  // Calculate observed ratios
  const observedRatios = variations.map((v) => v.participants / totalParticipants);

  // Calculate expected counts
  const expectedCounts = expectedRatios.map((r) => r * totalParticipants);

  // Calculate chi-squared statistic
  let chiSquared = 0;
  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const expected = expectedCounts[i];

    if (variation && expected !== undefined && expected > 0) {
      const observed = variation.participants;
      chiSquared += Math.pow(observed - expected, 2) / expected;
    }
  }

  // Calculate p-value (degrees of freedom = variations - 1)
  const degreesOfFreedom = variations.length - 1;
  const pValue = 1 - chiSquaredCDF(chiSquared, degreesOfFreedom);

  // Check for mismatch
  const hasMismatch = pValue < threshold;

  return {
    hasMismatch,
    pValue,
    expectedRatios,
    observedRatios,
    chiSquared,
    warning: hasMismatch
      ? 'Sample Ratio Mismatch detected! Investigate before trusting results.'
      : undefined,
  };
}

/**
 * Get a human-readable description of SRM severity.
 */
export function getSRMSeverity(pValue: number): string {
  if (pValue >= 0.1) return 'None';
  if (pValue >= 0.01) return 'Warning';
  if (pValue >= 0.001) return 'Serious';
  return 'Critical';
}
