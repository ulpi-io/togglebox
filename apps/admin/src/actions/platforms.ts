/**
 * Server actions for platform management.
 *
 * @module actions/platforms
 *
 * @remarks
 * These Next.js server actions handle platform CRUD operations from the admin dashboard.
 * Platforms are the top-level organization entities representing applications or services
 * (e.g., "web", "mobile-ios", "mobile-android").
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
import { createPlatformApi, deletePlatformApi } from '@/lib/api/platforms';
import { z } from 'zod';

/**
 * Zod schema for validating platform creation form data.
 *
 * @remarks
 * Validates:
 * - name: Unique platform identifier (1-100 chars, typically kebab-case like "mobile-ios")
 * - description: Optional human-readable description
 */
const createPlatformSchema = z.object({
  name: z.string().min(1, 'Platform name is required').max(100),
  description: z.string().optional(),
});

/**
 * Creates a new platform.
 *
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing platform name and description
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Form Fields:**
 * - `name`: Platform identifier (e.g., "web", "mobile-ios", "api-gateway")
 * - `description`: Optional description (e.g., "Web application for desktop users")
 *
 * **Naming Convention:**
 * Platform names should be:
 * - Lowercase, kebab-case (e.g., "mobile-ios" not "MobileiOS")
 * - Descriptive and unique across the system
 * - Alphanumeric with hyphens only
 *
 * **Side Effects:**
 * - Creates platform via API
 * - Revalidates Next.js cache for platforms list page
 * - Platform becomes available for environment and config management
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('name', 'web');
 * formData.append('description', 'Web application for desktop users');
 *
 * const result = await createPlatformAction(null, formData);
 * if (result.success) {
 *   console.log(result.message); // "Platform "web" created successfully"
 * }
 * ```
 */
export async function createPlatformAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = createPlatformSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
    });

    await createPlatformApi(data.name, data.description);

    revalidatePath('/platforms');

    return {
      success: true,
      message: `Platform "${data.name}" created successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create platform';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes a platform and all associated data.
 *
 * @param platform - Platform name to delete
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Warning:**
 * Deleting a platform is a CASCADE operation that also deletes:
 * - All environments within the platform
 * - All configuration versions for those environments
 * - All feature flags for those environments
 * - Any associated metadata
 *
 * This operation is permanent and cannot be undone.
 *
 * **Best Practice:**
 * Before deleting a platform:
 * 1. Ensure no active applications are using it
 * 2. Back up any configuration data you might need
 * 3. Update DNS/routing to prevent traffic to this platform
 * 4. Verify with team that deletion is intentional
 *
 * **Side Effects:**
 * - Deletes platform and all nested data via API
 * - Revalidates Next.js cache for platforms list page
 * - Client SDKs will receive 404 errors for deleted platform
 *
 * @example
 * ```ts
 * const result = await deletePlatformAction('deprecated-service');
 * if (result.success) {
 *   console.log(result.message); // "Platform "deprecated-service" deleted successfully"
 * }
 * ```
 */
export async function deletePlatformAction(
  platform: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await deletePlatformApi(platform);

    revalidatePath('/platforms');

    return {
      success: true,
      message: `Platform "${platform}" deleted successfully`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete platform';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
