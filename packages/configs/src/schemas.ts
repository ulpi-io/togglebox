/**
 * @togglebox/configs
 *
 * Zod schemas and TypeScript types for remote configuration management (Tier 1).
 *
 * @remarks
 * Remote Configs contain versioned parameters. Each parameter belongs to a
 * platform/environment and has version history. Only one version is active at a time.
 */

import { z } from "zod";

/**
 * System limits for config parameters.
 */
export const CONFIG_LIMITS = {
  /** Maximum parameters per platform/environment */
  MAX_PARAMETERS_PER_ENV: 2000,
  /** Maximum parameter key length */
  MAX_KEY_LENGTH: 256,
  /** Maximum parameter value length (as string) */
  MAX_VALUE_LENGTH: 10_000,
} as const;

/**
 * Parameter key validation regex.
 * Must start with a letter, contain only letters, numbers, underscores, and hyphens.
 * This matches the validation in configController.ts.
 */
const PARAMETER_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Schema for value types supported by config parameters.
 */
export const ConfigValueTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "json",
]);

/**
 * Schema for config parameters.
 *
 * @remarks
 * Each parameter is versioned. Only one version is active at a time.
 * Editing a parameter creates a new version and marks it active.
 *
 * @example
 * ```ts
 * const param: ConfigParameter = {
 *   platform: 'web',
 *   environment: 'production',
 *   parameterKey: 'api_url',
 *   version: '2',
 *   valueType: 'string',
 *   defaultValue: 'https://api.example.com',
 *   description: 'Backend API URL',
 *   isActive: true,
 *   createdBy: 'user@example.com',
 *   createdAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export const ConfigParameterSchema = z.object({
  // Identity (composite key: platform + environment + parameterKey + version)
  platform: z.string().min(1),
  environment: z.string().min(1),
  parameterKey: z
    .string()
    .min(1)
    .max(CONFIG_LIMITS.MAX_KEY_LENGTH)
    .regex(
      PARAMETER_KEY_REGEX,
      "Must start with a letter, containing only letters, numbers, underscores, and hyphens",
    ),
  version: z.string().min(1), // "1", "2", "3" etc.

  // Value
  valueType: ConfigValueTypeSchema,
  defaultValue: z.string().max(CONFIG_LIMITS.MAX_VALUE_LENGTH),

  // Metadata
  description: z.string().max(500).optional(),
  parameterGroup: z.string().max(100).optional(),

  // Versioning
  isActive: z.boolean().default(true), // Only one version active per parameterKey

  // Audit
  createdBy: z.string().email(),
  createdAt: z.string().datetime(),
});

/**
 * Schema for creating a config parameter.
 * Validates that defaultValue is valid for the specified valueType.
 */
export const CreateConfigParameterSchema = z
  .object({
    platform: z.string().min(1),
    environment: z.string().min(1),
    parameterKey: z
      .string()
      .min(1)
      .max(CONFIG_LIMITS.MAX_KEY_LENGTH)
      .regex(
        PARAMETER_KEY_REGEX,
        "Must start with a letter, containing only letters, numbers, underscores, and hyphens",
      ),
    valueType: ConfigValueTypeSchema,
    defaultValue: z.string().max(CONFIG_LIMITS.MAX_VALUE_LENGTH),
    description: z.string().max(500).optional(),
    parameterGroup: z.string().max(100).optional(),
    createdBy: z.string().email(),
  })
  .superRefine((data, ctx) => {
    // Validate defaultValue against valueType
    if (data.valueType === "number") {
      const num = parseFloat(data.defaultValue);
      if (!Number.isFinite(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `defaultValue "${data.defaultValue}" is not a valid number`,
          path: ["defaultValue"],
        });
      }
    } else if (data.valueType === "json") {
      try {
        JSON.parse(data.defaultValue);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `defaultValue is not valid JSON`,
          path: ["defaultValue"],
        });
      }
    } else if (data.valueType === "boolean") {
      if (data.defaultValue !== "true" && data.defaultValue !== "false") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `defaultValue must be "true" or "false" for boolean type`,
          path: ["defaultValue"],
        });
      }
    }
  });

/**
 * Schema for updating a config parameter (creates new version).
 * Validates that defaultValue is valid for valueType when both are provided.
 */
export const UpdateConfigParameterSchema = z
  .object({
    valueType: ConfigValueTypeSchema.optional(),
    defaultValue: z.string().max(CONFIG_LIMITS.MAX_VALUE_LENGTH).optional(),
    description: z.string().max(500).optional().nullable(),
    parameterGroup: z.string().max(100).optional().nullable(),
    createdBy: z.string().email(), // Who made this edit
  })
  .superRefine((data, ctx) => {
    // Only validate if both valueType and defaultValue are provided
    if (data.valueType && data.defaultValue !== undefined) {
      if (data.valueType === "number") {
        const num = parseFloat(data.defaultValue);
        if (!Number.isFinite(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `defaultValue "${data.defaultValue}" is not a valid number`,
            path: ["defaultValue"],
          });
        }
      } else if (data.valueType === "json") {
        try {
          JSON.parse(data.defaultValue);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `defaultValue is not valid JSON`,
            path: ["defaultValue"],
          });
        }
      } else if (data.valueType === "boolean") {
        if (data.defaultValue !== "true" && data.defaultValue !== "false") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `defaultValue must be "true" or "false" for boolean type`,
            path: ["defaultValue"],
          });
        }
      }
    }
  });

// Types
export type ConfigValueType = z.infer<typeof ConfigValueTypeSchema>;
export type ConfigParameter = z.infer<typeof ConfigParameterSchema>;
export type CreateConfigParameter = z.infer<typeof CreateConfigParameterSchema>;
export type UpdateConfigParameter = z.infer<typeof UpdateConfigParameterSchema>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parses a stored string value to its typed value.
 */
export function parseConfigValue(
  value: string,
  valueType: ConfigValueType,
): unknown {
  switch (valueType) {
    case "boolean":
      return value === "true";
    case "number": {
      const num = parseFloat(value);
      // SECURITY: Guard against NaN - return null for invalid number strings
      if (!Number.isFinite(num)) {
        return null;
      }
      return num;
    }
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    default:
      return value;
  }
}

/**
 * Serializes a typed value to string for storage.
 */
export function serializeConfigValue(
  value: unknown,
  valueType: ConfigValueType,
): string {
  switch (valueType) {
    case "json":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}
