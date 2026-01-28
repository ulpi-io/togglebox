/**
 * API Key management routes factory.
 *
 * @module routes/apiKeyRoutes
 *
 * @remarks
 * Creates Express router for API key management endpoints:
 * - List user's keys (GET /)
 * - Create new key (POST /)
 * - Get key details (GET /:id)
 * - Revoke key (DELETE /:id)
 *
 * **Base Path:** /api/v1/api-keys
 *
 * **Dependencies:**
 * - {@link ApiKeyController} - Request handlers
 * - {@link AuthMiddleware} - Authentication
 * - Zod validation schema (createApiKeySchema)
 *
 * **Authentication:**
 * All routes require JWT authentication.
 * Users can only manage their own API keys.
 *
 * **Security:**
 * - Full keys NEVER exposed (only prefix + last4)
 * - Plaintext key shown ONLY at creation time
 * - Ownership verification for all operations
 *
 * @example
 * ```typescript
 * const apiKeyController = new ApiKeyController(apiKeyService);
 * const authMiddleware = createAuthMiddleware(config);
 * const apiKeyRoutes = createApiKeyRoutes(apiKeyController, authMiddleware);
 *
 * app.use('/api/v1/api-keys', apiKeyRoutes);
 * ```
 */

import { Router } from "express";
import { ApiKeyController } from "../controllers/ApiKeyController";
import { validate } from "../validators/authSchemas";
import { createApiKeySchema } from "../validators/authSchemas";
import { AuthMiddleware } from "../middleware/auth";

/**
 * Create API key management routes.
 *
 * @param apiKeyController - API key controller instance
 * @param authMiddleware - Authentication middleware instance
 * @returns Express Router configured with API key routes
 *
 * @remarks
 * **Ownership Model:**
 * Users can only access and manage their own API keys.
 * Attempting to access another user's key returns 404.
 *
 * **Key Lifecycle:**
 * 1. Create: Generate key, return plaintext (ONE TIME)
 * 2. List: View all keys (prefix + last4 only)
 * 3. Get: View single key details (no full key)
 * 4. Revoke: Permanently delete key
 */
export function createApiKeyRoutes(
  apiKeyController: ApiKeyController,
  authMiddleware: AuthMiddleware,
): Router {
  const router = Router();

  /**
   * GET /api/v1/api-keys
   *
   * List authenticated user's API keys.
   *
   * **Middleware:** authMiddleware.authenticate
   * **Handler:** {@link ApiKeyController.listApiKeys}
   * **Authorization:** Authenticated user
   * **Returns:** Array of keys (prefix + last4, no full keys)
   */
  router.get("/", authMiddleware.authenticate, apiKeyController.listApiKeys);

  /**
   * POST /api/v1/api-keys
   *
   * Create new API key for authenticated user.
   *
   * **Middleware:** authMiddleware.authenticate, validate(createApiKeySchema)
   * **Handler:** {@link ApiKeyController.createApiKey}
   * **Authorization:** Authenticated user
   * **CRITICAL:** Full key shown ONLY in this response (ONE TIME)
   */
  router.post(
    "/",
    authMiddleware.authenticate,
    validate(createApiKeySchema),
    apiKeyController.createApiKey,
  );

  /**
   * GET /api/v1/api-keys/:id
   *
   * Get API key details by ID.
   *
   * **Middleware:** authMiddleware.authenticate
   * **Handler:** {@link ApiKeyController.getApiKey}
   * **Authorization:** Authenticated user
   * **Returns:** Key details (prefix + last4, no full key)
   */
  router.get("/:id", authMiddleware.authenticate, apiKeyController.getApiKey);

  /**
   * DELETE /api/v1/api-keys/:id
   *
   * Revoke (delete) an API key.
   *
   * **Middleware:** authMiddleware.authenticate
   * **Handler:** {@link ApiKeyController.revokeApiKey}
   * **Authorization:** Key owner only
   * **Warning:** Irreversible operation
   */
  router.delete(
    "/:id",
    authMiddleware.authenticate,
    apiKeyController.revokeApiKey,
  );

  return router;
}
