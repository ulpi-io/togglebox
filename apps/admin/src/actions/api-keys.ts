/**
 * Server actions for API key management.
 *
 * @module actions/api-keys
 *
 * @remarks
 * These Next.js server actions handle API key CRUD operations for service-to-service
 * authentication. API keys are used by internal services to authenticate with the
 * configuration API without requiring user credentials.
 *
 * **Security Model:**
 * - API keys are generated server-side with cryptographically secure random tokens
 * - Keys are hashed before storage in the database
 * - Only the raw key is shown ONCE upon creation (cannot be retrieved later)
 * - Keys should be stored securely in service environment variables
 *
 * **Use Cases:**
 * - Internal service-to-service API authentication
 * - CI/CD pipeline authentication (for automated deployments)
 * - Backend service authentication (for config updates)
 * - Webhook endpoint authentication (for cache invalidation)
 *
 * **Rate Limiting:**
 * API keys are subject to the same rate limiting as authenticated requests.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createApiKeyApi, deleteApiKeyApi } from '@/lib/api/api-keys';
import { z } from 'zod';

/**
 * Zod schema for validating API key creation form data.
 *
 * @remarks
 * Validates:
 * - name: Human-readable identifier for the API key (1-100 chars)
 *
 * **Naming Convention:**
 * API key names should be descriptive and indicate the service or purpose:
 * - "CI/CD Pipeline" - For automated deployments
 * - "Backend Service" - For internal backend services
 * - "Monitoring Service" - For monitoring and health check services
 * - "Webhook Handler" - For webhook processing services
 */
const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
});

/**
 * Creates a new API key for service-to-service authentication.
 *
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing API key name
 *
 * @returns Promise resolving to action result with success status, message/error, and the raw API key
 *
 * @remarks
 * **Security - Critical:**
 * The raw API key is ONLY returned in the response to this action and cannot be
 * retrieved later. Users MUST save the key immediately upon creation.
 *
 * **Storage:**
 * - Raw key (returned in response): Store in service's environment variables
 * - Hashed key (stored in database): Used for verification during authentication
 *
 * **Key Format:**
 * Keys are typically formatted as: `tb_` + random alphanumeric string (e.g., `tb_a1b2c3d4e5f6...`)
 *
 * **Best Practices:**
 * - Create separate API keys for each service or environment
 * - Use descriptive names to identify the key's purpose
 * - Rotate keys quarterly or when compromised
 * - Delete unused or deprecated keys immediately
 * - Never commit API keys to version control
 * - Store keys in secure secret management systems (AWS Secrets Manager, Vault, etc.)
 *
 * **Side Effects:**
 * - Creates API key via backend API
 * - Revalidates Next.js cache for API keys list page
 * - Returns raw key for one-time display to user
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('name', 'CI/CD Pipeline');
 *
 * const result = await createApiKeyAction(null, formData);
 * if (result.success) {
 *   console.log('API Key:', result.apiKey); // SAVE THIS - Cannot retrieve later!
 *   // Display to user: "Save this key securely, it will not be shown again"
 *   // Example key: tb_a1b2c3d4e5f6g7h8i9j0
 * }
 * ```
 */
export async function createApiKeyAction(
  prevState: unknown,
  formData: FormData
): Promise<{
  success: boolean;
  message?: string;
  apiKey?: string;
  error?: string;
  errors?: Record<string, string[]>;
}> {
  try {
    const data = createApiKeySchema.parse({
      name: formData.get('name'),
    });

    const apiKey = await createApiKeyApi(data.name);

    revalidatePath('/api-keys');

    return {
      success: true,
      message: `API key "${data.name}" created successfully`,
      apiKey: apiKey.key, // Return the actual key to display to user
    };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create API key';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes an API key permanently.
 *
 * @param keyId - Unique identifier of the API key to delete
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Warning:**
 * Deleting an API key is permanent and will immediately invalidate all requests
 * using that key. Any services using this key will start receiving 401 Unauthorized
 * errors and will fail to authenticate.
 *
 * **Impact:**
 * - Existing service requests using this key will fail immediately
 * - Cached authentication tokens (if any) will be invalidated
 * - Services must be updated with a new API key to restore functionality
 *
 * **Best Practice:**
 * Before deleting an API key:
 * 1. Identify which services are using the key
 * 2. Create a new API key for those services
 * 3. Update services with the new key
 * 4. Wait 24-48 hours to ensure old key is no longer in use
 * 5. Monitor logs for 401 errors after deletion
 * 6. Then delete the old key
 *
 * **Emergency Revocation:**
 * If a key is compromised, delete it immediately to prevent unauthorized access.
 * Update affected services as soon as possible.
 *
 * **Side Effects:**
 * - Deletes API key from database via backend API
 * - Revalidates Next.js cache for API keys list page
 * - Invalidates any cached authentication using this key
 *
 * @throws {Error} If API call fails or key doesn't exist (caught and returned as error state)
 *
 * @example
 * ```ts
 * // Delete deprecated API key
 * const result = await deleteApiKeyAction('key-id-123');
 * if (result.success) {
 *   console.log(result.message); // "API key deleted successfully"
 * }
 *
 * // Emergency key revocation
 * // If key is compromised, delete immediately:
 * await deleteApiKeyAction('compromised-key-id');
 * // Then create new key and update services
 * ```
 */
export async function deleteApiKeyAction(
  keyId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await deleteApiKeyApi(keyId);

    revalidatePath('/api-keys');

    return {
      success: true,
      message: 'API key deleted successfully',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete API key';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
