/**
 * Server actions for feature flag management.
 *
 * @module actions/feature-flags
 *
 * @remarks
 * These Next.js server actions handle feature flag CRUD operations
 * from the admin dashboard. Feature flags support:
 * - Simple on/off toggles
 * - Percentage-based gradual rollouts
 * - Targeted rollouts (by user, country, language)
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
import {
  createFeatureFlagApi,
  toggleFeatureFlagApi,
  updateFeatureFlagApi,
  deleteFeatureFlagApi,
} from '@/lib/api/feature-flags';
import { z } from 'zod';

/**
 * Zod schema for validating feature flag creation form data.
 *
 * @remarks
 * Validates:
 * - flagName: Unique identifier (1-100 chars)
 * - enabled: Boolean toggle state
 * - rolloutType: Deployment strategy (simple/percentage/targeted)
 * - rolloutPercentage: 0-100 (required if rolloutType is 'percentage')
 * - targeting rules: User IDs, countries, languages (required if rolloutType is 'targeted')
 */
const createFeatureFlagSchema = z.object({
  flagName: z.string().min(1, 'Flag name is required').max(100),
  description: z.string().optional(),
  enabled: z.boolean(),
  rolloutType: z.enum(['simple', 'percentage', 'targeted']),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  targetUserIds: z.array(z.string()).optional(),
  excludeUserIds: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  targetLanguages: z.array(z.string()).optional(),
});

/**
 * Creates a new feature flag with rollout configuration.
 *
 * @param platform - Platform identifier (e.g., "web", "mobile")
 * @param environment - Environment name (e.g., "production", "staging")
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing flag configuration
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Form Fields:**
 * - `flagName`: Unique flag identifier (e.g., "dark-mode", "new-checkout")
 * - `description`: Optional human-readable description
 * - `enabled`: Initial toggle state (true/false)
 * - `rolloutType`: Deployment strategy:
 *   - `simple`: All users see same state (enabled/disabled)
 *   - `percentage`: Gradual rollout (e.g., 25% of users)
 *   - `targeted`: Specific users, countries, or languages
 *
 * **Rollout Type: Percentage**
 * - `rolloutPercentage`: Number 0-100 (e.g., 50 means 50% of users)
 * - Uses consistent hashing to ensure same user always gets same result
 *
 * **Rollout Type: Targeted**
 * - `targetUserIds`: Comma-separated user IDs to include
 * - `excludeUserIds`: Comma-separated user IDs to exclude (takes precedence)
 * - `targetCountries`: Comma-separated country codes (ISO 3166-1 alpha-2)
 * - `targetLanguages`: Comma-separated language codes (ISO 639-1)
 *
 * **Side Effects:**
 * - Creates feature flag via API
 * - Revalidates Next.js cache for flags list page
 * - Backend cache invalidation ensures immediate SDK visibility
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * // Simple toggle
 * const formData = new FormData();
 * formData.append('flagName', 'dark-mode');
 * formData.append('enabled', 'true');
 * formData.append('rolloutType', 'simple');
 *
 * // Percentage rollout
 * formData.append('rolloutType', 'percentage');
 * formData.append('rolloutPercentage', '25'); // 25% of users
 *
 * // Targeted rollout
 * formData.append('rolloutType', 'targeted');
 * formData.append('targetUserIds', 'user123,user456');
 * formData.append('targetCountries', 'US,CA');
 * ```
 */
export async function createFeatureFlagAction(
  platform: string,
  environment: string,
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; errors?: Record<string, string[]> }> {
  try {
    const rolloutType = formData.get('rolloutType') as 'simple' | 'percentage' | 'targeted';

    const data = createFeatureFlagSchema.parse({
      flagName: formData.get('flagName'),
      description: formData.get('description') || undefined,
      enabled: formData.get('enabled') === 'true',
      rolloutType,
      rolloutPercentage:
        rolloutType === 'percentage'
          ? parseInt(formData.get('rolloutPercentage') as string, 10)
          : undefined,
      targetUserIds:
        rolloutType === 'targeted' && formData.get('targetUserIds')
          ? (formData.get('targetUserIds') as string).split(',').map((s) => s.trim())
          : undefined,
      excludeUserIds:
        rolloutType === 'targeted' && formData.get('excludeUserIds')
          ? (formData.get('excludeUserIds') as string).split(',').map((s) => s.trim())
          : undefined,
      targetCountries:
        rolloutType === 'targeted' && formData.get('targetCountries')
          ? (formData.get('targetCountries') as string).split(',').map((s) => s.trim())
          : undefined,
      targetLanguages:
        rolloutType === 'targeted' && formData.get('targetLanguages')
          ? (formData.get('targetLanguages') as string).split(',').map((s) => s.trim())
          : undefined,
    });

    await createFeatureFlagApi(platform, environment, data);

    revalidatePath(`/platforms/${platform}/environments/${environment}/flags`);

    return {
      success: true,
      message: `Feature flag "${data.flagName}" created successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create feature flag';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Toggles a feature flag's enabled state (on/off).
 *
 * @param platform - Platform identifier
 * @param environment - Environment name
 * @param flagName - Feature flag name to toggle
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Behavior:**
 * - If flag is currently enabled, it will be disabled
 * - If flag is currently disabled, it will be enabled
 * - Rollout configuration (percentage, targeting) is preserved
 *
 * **Side Effects:**
 * - Updates flag's enabled state via API
 * - Revalidates Next.js cache for flags list page
 * - Backend cache invalidation ensures immediate SDK visibility
 *
 * **Use Case:**
 * Quick on/off toggle for instant feature control without changing rollout rules.
 * Useful for emergency rollback or A/B test control.
 *
 * @example
 * ```ts
 * // Disable a currently-enabled flag
 * const result = await toggleFeatureFlagAction('web', 'production', 'new-checkout');
 * if (result.success) {
 *   console.log(result.message); // "Feature flag "new-checkout" toggled successfully"
 * }
 * ```
 */
export async function toggleFeatureFlagAction(
  platform: string,
  environment: string,
  flagName: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await toggleFeatureFlagApi(platform, environment, flagName);

    revalidatePath(`/platforms/${platform}/environments/${environment}/flags`);

    return {
      success: true,
      message: `Feature flag "${flagName}" toggled successfully`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to toggle feature flag';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes a feature flag permanently.
 *
 * @param platform - Platform identifier
 * @param environment - Environment name
 * @param flagName - Feature flag name to delete
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Warning:**
 * Deleting a feature flag is permanent and cannot be undone.
 * Client applications checking this flag will receive `false` (disabled) after deletion.
 *
 * **Best Practice:**
 * Before deleting a production flag:
 * 1. Disable it first and monitor for issues
 * 2. Wait 24-48 hours to ensure no critical dependencies
 * 3. Remove flag checks from application code
 * 4. Then delete the flag from the system
 *
 * **Side Effects:**
 * - Deletes flag from database via API
 * - Revalidates Next.js cache for flags list page
 * - Backend cache invalidation ensures flag is no longer served
 *
 * @example
 * ```ts
 * const result = await deleteFeatureFlagAction('web', 'production', 'deprecated-feature');
 * if (result.success) {
 *   console.log(result.message); // "Feature flag "deprecated-feature" deleted successfully"
 * }
 * ```
 */
export async function deleteFeatureFlagAction(
  platform: string,
  environment: string,
  flagName: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await deleteFeatureFlagApi(platform, environment, flagName);

    revalidatePath(`/platforms/${platform}/environments/${environment}/flags`);

    return {
      success: true,
      message: `Feature flag "${flagName}" deleted successfully`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete feature flag';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
