/**
 * @togglebox/core
 *
 * Shared schemas and utilities used across the ToggleBox ecosystem.
 *
 * @remarks
 * This package provides shared types and utilities that are used by multiple packages:
 * - Platform and Environment: Organizational units shared by ALL three tiers
 * - API response schemas: Standard response format
 * - bumpVersion utility: Semantic versioning helper
 *
 * For domain-specific schemas, use the appropriate package:
 * - Remote Configs: @togglebox/configs
 * - Feature Flags: @togglebox/flags
 * - Experiments: @togglebox/experiments
 * - Stats: @togglebox/stats
 */

import { z } from 'zod';

// ============================================================================
// ORGANIZATIONAL UNITS (Shared by ALL three tiers)
// ============================================================================

/**
 * Schema for platform objects.
 *
 * @remarks
 * Represents a top-level application or service.
 * Platforms are the highest-level organizational unit and are shared
 * across ALL three tiers (configs, flags, experiments).
 *
 * @example
 * ```ts
 * const platform: Platform = {
 *   id: 'uuid-here',
 *   name: 'web-app',
 *   description: 'Main web application',
 *   createdAt: '2025-01-01T00:00:00.000Z',
 * };
 * ```
 */
export const PlatformSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

/**
 * Schema for environment objects.
 *
 * @remarks
 * Represents a deployment environment within a platform.
 * Environments are shared across ALL three tiers (configs, flags, experiments).
 *
 * @example
 * ```ts
 * const env: Environment = {
 *   platform: 'web-app',
 *   environment: 'production',
 *   description: 'Production environment',
 *   createdAt: '2025-01-01T00:00:00.000Z',
 * };
 * ```
 */
export const EnvironmentSchema = z.object({
  platform: z.string(),
  environment: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

/** Platform type - top-level organizational unit shared by all tiers */
export type Platform = z.infer<typeof PlatformSchema>;

/** Environment type - deployment environment shared by all tiers */
export type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * Schema for successful API responses.
 *
 * Note: data is 'unknown' rather than 'any' for type safety.
 * Consumers must validate/narrow the type before use.
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

/**
 * Schema for error API responses.
 *
 * @remarks
 * Standardized error format used across all API endpoints.
 *
 * **Base Fields (always present):**
 * - success: Always false for errors
 * - error: Human-readable error message
 * - timestamp: ISO-8601 timestamp
 *
 * **Optional Fields:**
 * - code: Machine-readable error code (e.g., "API_LIMIT_EXCEEDED", "VALIDATION_FAILED")
 * - details: Array of detailed error messages (for validation errors)
 * - meta: Additional context based on error type:
 *   - retryAfter: Seconds until retry allowed (rate limiting)
 *   - usage/limit: Current usage and limit (quota errors)
 *   - upgradeUrl: URL to upgrade plan (subscription errors)
 *   - requiredPermission/requiredRole: Missing permission/role (auth errors)
 *   - stack: Error stack trace (development mode only)
 *
 * **Examples:**
 *
 * Validation error:
 * ```json
 * {
 *   "success": false,
 *   "error": "Validation failed",
 *   "code": "VALIDATION_FAILED",
 *   "timestamp": "2025-01-01T00:00:00.000Z",
 *   "details": ["email: Invalid email format", "password: Too short"]
 * }
 * ```
 *
 * Rate limiting error:
 * ```json
 * {
 *   "success": false,
 *   "error": "Too many requests",
 *   "code": "RATE_LIMIT_EXCEEDED",
 *   "timestamp": "2025-01-01T00:00:00.000Z",
 *   "meta": { "retryAfter": 45 }
 * }
 * ```
 *
 * Usage limit error:
 * ```json
 * {
 *   "success": false,
 *   "error": "API request limit exceeded",
 *   "code": "API_LIMIT_EXCEEDED",
 *   "timestamp": "2025-01-01T00:00:00.000Z",
 *   "meta": {
 *     "usage": 1000,
 *     "limit": 1000,
 *     "upgradeUrl": "https://example.com/upgrade"
 *   }
 * }
 * ```
 *
 * Permission error:
 * ```json
 * {
 *   "success": false,
 *   "error": "Insufficient permissions",
 *   "code": "INSUFFICIENT_PERMISSIONS",
 *   "timestamp": "2025-01-01T00:00:00.000Z",
 *   "meta": { "requiredPermission": "config:write" }
 * }
 * ```
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  timestamp: z.string(),
  details: z.array(z.string()).optional(),
  meta: z.record(z.unknown()).optional(),
});

/** Standard API response type */
export type ApiResponse = z.infer<typeof ApiResponseSchema>;

/** Error response type */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Utility function to bump a semantic version string.
 *
 * @param currentVersion - Current version string (e.g., "1.0.0", "1.2.3")
 * @param type - Type of bump: "major" (1.0.0 → 2.0.0), "minor" (1.0.0 → 1.1.0), "patch" (1.0.0 → 1.0.1)
 * @returns Bumped version string
 *
 * @example
 * ```ts
 * bumpVersion('1.0.0', 'patch'); // "1.0.1"
 * bumpVersion('1.2.3', 'minor'); // "1.3.0"
 * bumpVersion('1.2.3', 'major'); // "2.0.0"
 * bumpVersion('invalid', 'patch'); // "invalid.1" (fallback)
 * ```
 */
export function bumpVersion(
  currentVersion: string,
  type: 'major' | 'minor' | 'patch' = 'patch'
): string {
  const parts = currentVersion.split('.');
  if (parts.length === 3) {
    const parsed = parts.map((p) => parseInt(p, 10));
    const major = parsed[0];
    const minor = parsed[1];
    const patch = parsed[2];
    if (
      major !== undefined &&
      minor !== undefined &&
      patch !== undefined &&
      !isNaN(major) &&
      !isNaN(minor) &&
      !isNaN(patch)
    ) {
      switch (type) {
        case 'major':
          return `${major + 1}.0.0`;
        case 'minor':
          return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
          return `${major}.${minor}.${patch + 1}`;
      }
    }
  }
  // Fallback for non-semver versions
  return `${currentVersion}.1`;
}
