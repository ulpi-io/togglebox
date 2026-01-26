/**
 * @togglebox/experiments - Experiment Evaluator
 *
 * Assigns users to experiment variations based on consistent hashing.
 * Ensures the same user always gets the same variation.
 */

import type {
  Experiment,
  ExperimentContext,
  VariantAssignment,
  ExperimentVariation,
} from './schemas';

/**
 * Assignment reasons for debugging.
 */
export const AssignmentReason = {
  EXPERIMENT_NOT_RUNNING: 'Experiment is not running',
  EXPERIMENT_NOT_STARTED: 'Experiment has not started yet (scheduled start in future)',
  EXPERIMENT_ENDED: 'Experiment has ended (scheduled end passed)',
  FORCE_EXCLUDED: 'User is in force exclude list',
  NOT_IN_TARGET: 'User does not match targeting criteria',
  HASH_ASSIGNMENT: 'Assigned via consistent hash',
} as const;

/**
 * Hash a string using djb2 algorithm with mixing.
 * Same algorithm used in feature flag evaluator for consistency.
 */
function hashString(str: string): number {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }

  // Final mixing step for better distribution
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Get a percentage (0-100) from a hash.
 */
function getPercentage(userId: string, experimentKey: string): number {
  const combinedKey = `${experimentKey}:${userId}`;
  const hash = hashString(combinedKey);
  return (hash % 10000) / 100; // 0.00 to 99.99
}

/**
 * Check if user matches targeting criteria.
 */
function matchesTargeting(
  experiment: Experiment,
  context: ExperimentContext
): boolean {
  const { targeting } = experiment;
  const { userId, country } = context;

  // Check force exclude
  if (targeting.forceExcludeUsers.includes(userId)) {
    return false;
  }

  // Check force include (overrides geographic targeting)
  if (targeting.forceIncludeUsers.includes(userId)) {
    return true;
  }

  // Check geographic targeting
  if (targeting.countries.length > 0) {
    if (!country) return false;

    const countryMatch = targeting.countries.find(
      (c) => c.country.toUpperCase() === country.toUpperCase()
    );

    if (!countryMatch) return false;

    // Check language targeting within country
    if (countryMatch.languages && countryMatch.languages.length > 0) {
      const { language } = context;
      if (!language) return false;

      const languageMatch = countryMatch.languages.find(
        (l) => l.language.toLowerCase() === language.toLowerCase()
      );

      if (!languageMatch) return false;
    }
  }

  return true;
}

/**
 * Assign a user to an experiment variation.
 *
 * @param experiment - The experiment to evaluate
 * @param context - The evaluation context (userId, country, language)
 * @returns The assigned variation or null if user is not in experiment
 *
 * @remarks
 * Assignment process:
 * 1. Check if experiment is running
 * 2. Check scheduled start/end dates (if defined)
 * 3. Check if user is force-excluded
 * 4. Check if user matches targeting (country/language)
 * 5. Use consistent hash to assign to a variation
 *
 * The hash is based on `experimentKey:userId` to ensure:
 * - Same user always gets same variation
 * - Different experiments have independent assignments
 */
export function assignVariation(
  experiment: Experiment,
  context: ExperimentContext
): VariantAssignment | null {
  const { experimentKey, variations, trafficAllocation, status } = experiment;
  const { userId } = context;

  // 1. Check if experiment is running
  if (status !== 'running') {
    return null;
  }

  // 2. Check scheduled start/end dates
  const now = new Date();

  if (experiment.scheduledStartAt) {
    const startDate = new Date(experiment.scheduledStartAt);
    if (startDate > now) {
      // Experiment hasn't started yet
      return null;
    }
  }

  if (experiment.scheduledEndAt) {
    const endDate = new Date(experiment.scheduledEndAt);
    if (endDate < now) {
      // Experiment has already ended
      return null;
    }
  }

  // 3. Check targeting
  if (!matchesTargeting(experiment, context)) {
    return null;
  }

  // 4. Get user's hash percentage
  const percentage = getPercentage(userId, experimentKey);

  // 5. Find the variation based on traffic allocation
  let cumulativePercentage = 0;
  let assignedVariation: ExperimentVariation | null = null;

  for (const allocation of trafficAllocation) {
    cumulativePercentage += allocation.percentage;

    if (percentage < cumulativePercentage) {
      assignedVariation = variations.find((v) => v.key === allocation.variationKey) || null;
      break;
    }
  }

  // Fallback to last variation if rounding issues
  if (!assignedVariation && variations.length > 0) {
    assignedVariation = variations[variations.length - 1] ?? null;
  }

  if (!assignedVariation) {
    return null;
  }

  return {
    experimentKey,
    variationKey: assignedVariation.key,
    value: assignedVariation.value,
    isControl: assignedVariation.isControl,
    reason: AssignmentReason.HASH_ASSIGNMENT,
  };
}

/**
 * Get all experiment assignments for a user.
 *
 * @param experiments - Array of experiments to evaluate
 * @param context - The evaluation context
 * @returns Map of experimentKey to variation assignment
 */
export function assignMultipleExperiments(
  experiments: Experiment[],
  context: ExperimentContext
): Map<string, VariantAssignment> {
  const assignments = new Map<string, VariantAssignment>();

  for (const experiment of experiments) {
    const assignment = assignVariation(experiment, context);
    if (assignment) {
      assignments.set(experiment.experimentKey, assignment);
    }
  }

  return assignments;
}

/**
 * Check if a user is in a specific variation of an experiment.
 *
 * @param experiment - The experiment to check
 * @param context - The evaluation context
 * @param variationKey - The variation key to check
 * @returns true if user is assigned to the specified variation
 */
export function isInVariation(
  experiment: Experiment,
  context: ExperimentContext,
  variationKey: string
): boolean {
  const assignment = assignVariation(experiment, context);
  return assignment?.variationKey === variationKey;
}

/**
 * Preview what variation a user would get without recording exposure.
 * Same as assignVariation but explicitly for preview/debugging.
 */
export function previewAssignment(
  experiment: Experiment,
  context: ExperimentContext
): VariantAssignment | null {
  return assignVariation(experiment, context);
}
