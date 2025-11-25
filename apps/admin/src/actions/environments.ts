/**
 * Server actions for environment management.
 *
 * @module actions/environments
 *
 * @remarks
 * These Next.js server actions handle environment CRUD operations from the admin dashboard.
 * Environments represent deployment targets within a platform
 * (e.g., "development", "staging", "production", "canary").
 *
 * All actions:
 * - Run on the server (React Server Actions)
 * - Validate form data with Zod schemas
 * - Call backend API via wrapper functions
 * - Revalidate Next.js cache paths after mutations
 * - Return success/error states for UI feedback
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createEnvironmentApi, deleteEnvironmentApi } from '@/lib/api/platforms';
import { z } from 'zod';

/**
 * Zod schema for validating environment creation form data.
 *
 * @remarks
 * Validates:
 * - name: Environment identifier (1-50 chars, typically lowercase like "production")
 * - description: Optional human-readable description
 */
const createEnvironmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required').max(50),
  description: z.string().optional(),
});

/**
 * Creates a new environment within a platform.
 *
 * @param platform - Platform name to create environment in
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing environment name and description
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Form Fields:**
 * - `name`: Environment identifier (e.g., "production", "staging", "dev")
 * - `description`: Optional description (e.g., "Production environment for end users")
 *
 * **Common Environment Names:**
 * - `production`: Live environment serving end users
 * - `staging`: Pre-production testing environment (mirrors production)
 * - `development`: Development/testing environment for engineers
 * - `qa`: Quality assurance environment for testing team
 * - `canary`: Canary deployment for gradual production rollout
 *
 * **Naming Convention:**
 * Environment names should be:
 * - Lowercase (e.g., "production" not "Production")
 * - Descriptive and match your deployment pipeline
 * - Consistent across all platforms
 *
 * **Side Effects:**
 * - Creates environment via API
 * - Revalidates Next.js cache for platform detail page
 * - Environment becomes available for configuration and feature flag management
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If API call fails or platform doesn't exist (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('name', 'production');
 * formData.append('description', 'Production environment for end users');
 *
 * const result = await createEnvironmentAction('web', null, formData);
 * if (result.success) {
 *   console.log(result.message); // "Environment "production" created successfully"
 * }
 * ```
 */
export async function createEnvironmentAction(
  platform: string,
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = createEnvironmentSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
    });

    await createEnvironmentApi(platform, data.name, data.description);

    revalidatePath(`/platforms/${platform}`);

    return {
      success: true,
      message: `Environment "${data.name}" created successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create environment';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes an environment and all associated data.
 *
 * @param platform - Platform name containing the environment
 * @param environment - Environment name to delete
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Warning:**
 * Deleting an environment is a CASCADE operation that also deletes:
 * - All configuration versions for this environment
 * - All feature flags for this environment
 * - Any associated metadata
 *
 * This operation is permanent and cannot be undone.
 *
 * **Best Practice:**
 * Before deleting an environment:
 * 1. Ensure no active deployments are using it
 * 2. Verify client applications are not pointing to this environment
 * 3. Back up any configuration data you might need
 * 4. Update CI/CD pipelines to remove references
 * 5. Coordinate with team to avoid disruption
 *
 * **Production Safety:**
 * Consider requiring additional confirmation for deleting "production" environments.
 * Some teams implement soft-delete or archival instead of hard deletion.
 *
 * **Side Effects:**
 * - Deletes environment and all nested data via API
 * - Revalidates Next.js cache for platform detail page
 * - Client SDKs will receive 404 errors for deleted environment
 *
 * @example
 * ```ts
 * const result = await deleteEnvironmentAction('web', 'old-staging');
 * if (result.success) {
 *   console.log(result.message); // "Environment "old-staging" deleted successfully"
 * }
 * ```
 */
export async function deleteEnvironmentAction(
  platform: string,
  environment: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await deleteEnvironmentApi(platform, environment);

    revalidatePath(`/platforms/${platform}`);

    return {
      success: true,
      message: `Environment "${environment}" deleted successfully`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete environment';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
