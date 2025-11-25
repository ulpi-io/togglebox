/**
 * Server actions for configuration version management.
 *
 * @module actions/configs
 *
 * @remarks
 * These Next.js server actions handle configuration CRUD operations
 * from the admin dashboard. All actions:
 * - Run on the server (React Server Actions)
 * - Validate form data with Zod schemas
 * - Call backend API via wrapper functions
 * - Revalidate Next.js cache paths after mutations
 * - Return success/error states for UI feedback
 */
'use server';

import { revalidatePath } from 'next/cache';
import {
  createConfigVersionApi,
  markConfigStableApi,
  deleteConfigVersionApi,
} from '@/lib/api/configs';
import { z } from 'zod';

/**
 * Zod schema for validating configuration version creation form data.
 *
 * @remarks
 * Validates:
 * - version: Semantic versioning format (X.Y.Z)
 * - config: Non-empty JSON string
 * - isStable: Optional boolean flag
 */
const createConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format X.Y.Z'),
  config: z.string().min(1, 'Configuration is required'),
  isStable: z.boolean().optional(),
});

/**
 * Creates a new configuration version for a platform environment.
 *
 * @param platform - Platform identifier (e.g., "web", "mobile")
 * @param environment - Environment name (e.g., "production", "staging")
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing version, config JSON, and isStable flag
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Form Fields:**
 * - `version`: Semantic version string (e.g., "1.2.3")
 * - `config`: JSON configuration string (will be parsed and validated)
 * - `isStable`: Boolean indicating if version is production-ready
 *
 * **Validation:**
 * 1. Parses and validates JSON format
 * 2. Validates version format (X.Y.Z)
 * 3. Validates required fields with Zod schema
 *
 * **Side Effects:**
 * - Creates configuration version via API
 * - Revalidates Next.js cache for configs list page
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('version', '1.0.0');
 * formData.append('config', JSON.stringify({ apiUrl: 'https://api.example.com' }));
 * formData.append('isStable', 'true');
 *
 * const result = await createConfigVersionAction('web', 'production', null, formData);
 * if (result.success) {
 *   console.log(result.message); // "Configuration version 1.0.0 created successfully"
 * }
 * ```
 */
export async function createConfigVersionAction(
  platform: string,
  environment: string,
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; errors?: Record<string, string[]> }> {
  try {
    const configString = formData.get('config') as string;
    const isStable = formData.get('isStable') === 'true';

    // Validate JSON
    let configObject;
    try {
      configObject = JSON.parse(configString);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON format',
      };
    }

    const data = createConfigSchema.parse({
      version: formData.get('version'),
      config: configString,
      isStable,
    });

    await createConfigVersionApi(
      platform,
      environment,
      data.version,
      configObject,
      data.isStable
    );

    revalidatePath(`/platforms/${platform}/environments/${environment}/configs`);

    return {
      success: true,
      message: `Configuration version ${data.version} created successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create configuration';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Marks a configuration version as stable (production-ready).
 *
 * @param platform - Platform identifier
 * @param environment - Environment name
 * @param version - Version timestamp or label to mark as stable
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Purpose:**
 * Marking a version as stable indicates it's ready for production use.
 * Client SDKs query for the "latest stable" version to fetch production configs.
 *
 * **Side Effects:**
 * - Updates version's isStable flag via API
 * - Revalidates Next.js cache for configs list page
 * - Cache invalidation on backend ensures immediate SDK visibility
 *
 * @example
 * ```ts
 * const result = await markConfigStableAction('web', 'production', '2024-11-23T10:30:00.000Z');
 * if (result.success) {
 *   console.log(result.message); // "Version 2024-11-23T10:30:00.000Z marked as stable"
 * }
 * ```
 */
export async function markConfigStableAction(
  platform: string,
  environment: string,
  version: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await markConfigStableApi(platform, environment, version);

    revalidatePath(`/platforms/${platform}/environments/${environment}/configs`);

    return {
      success: true,
      message: `Version ${version} marked as stable`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to mark version as stable';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes a configuration version.
 *
 * @param platform - Platform identifier
 * @param environment - Environment name
 * @param version - Version timestamp or label to delete
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Warning:**
 * Deleting a configuration version is permanent and cannot be undone.
 * If this version is currently marked as stable, consider marking a different
 * version as stable before deletion to avoid breaking client applications.
 *
 * **Side Effects:**
 * - Deletes version from database via API
 * - Revalidates Next.js cache for configs list page
 * - Backend cache invalidation ensures removed version is no longer served
 *
 * @example
 * ```ts
 * const result = await deleteConfigVersionAction('web', 'production', '2024-11-20T08:00:00.000Z');
 * if (result.success) {
 *   console.log(result.message); // "Version 2024-11-20T08:00:00.000Z deleted successfully"
 * }
 * ```
 */
export async function deleteConfigVersionAction(
  platform: string,
  environment: string,
  version: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await deleteConfigVersionApi(platform, environment, version);

    revalidatePath(`/platforms/${platform}/environments/${environment}/configs`);

    return {
      success: true,
      message: `Version ${version} deleted successfully`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete version';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
