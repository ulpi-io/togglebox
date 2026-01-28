/**
 * Validation utilities for targeting rules (flags, experiments).
 * Shared across create and edit pages.
 */

export interface ValidationResult {
  valid: string[];
  duplicates: string[];
  invalid: string[];
}

export interface CountryCodeValidation {
  valid: boolean;
  formatted: string;
}

export interface FlagKeyValidation {
  valid: boolean;
  error: string | null;
}

/**
 * Validates a comma/newline-separated list of user IDs.
 * User IDs can contain letters, numbers, underscores, hyphens, dots, and @.
 */
export function validateUserList(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: [], duplicates: [], invalid: [] };
  }

  const entries = input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];

  const validPattern = /^[\w\-\.@]+$/;

  for (const entry of entries) {
    if (!validPattern.test(entry)) {
      invalid.push(entry);
    } else if (seen.has(entry.toLowerCase())) {
      duplicates.push(entry);
    } else {
      seen.add(entry.toLowerCase());
      valid.push(entry);
    }
  }

  return { valid, duplicates, invalid };
}

/**
 * Validates a 2-letter ISO country code (e.g., "US", "GB").
 * Returns the formatted uppercase version.
 */
export function validateCountryCode(code: string): CountryCodeValidation {
  const trimmed = code.trim().toUpperCase();
  const isValid = /^[A-Z]{2}$/.test(trimmed);
  return { valid: isValid || trimmed === "", formatted: trimmed };
}

/**
 * Validates a comma-separated list of 2-letter ISO 639-1 language codes.
 * E.g., "en, es, fr"
 */
export function validateLanguages(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: [], invalid: [], duplicates: [] };
  }

  const entries = input
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];

  // Backend requires exactly 2 letters (ISO 639-1)
  const validPattern = /^[a-z]{2}$/;

  for (const entry of entries) {
    if (!validPattern.test(entry)) {
      invalid.push(entry);
    } else if (seen.has(entry)) {
      duplicates.push(entry);
    } else {
      seen.add(entry);
      valid.push(entry);
    }
  }

  return { valid, invalid, duplicates };
}

/**
 * Validates a flag key.
 * Must be lowercase, start with a letter, contain only letters, numbers, underscores, hyphens.
 */
export function validateFlagKey(key: string): FlagKeyValidation {
  if (!key.trim()) {
    return { valid: false, error: null }; // Empty handled by "required" check
  }
  const pattern = /^[a-z][a-z0-9_-]*$/;
  if (!pattern.test(key)) {
    return {
      valid: false,
      error:
        "Must be lowercase, start with a letter, contain only letters, numbers, underscores, hyphens",
    };
  }
  return { valid: true, error: null };
}
