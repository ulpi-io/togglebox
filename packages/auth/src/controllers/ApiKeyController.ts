/**
 * API Key management controller for Express routes.
 *
 * @module controllers/ApiKeyController
 *
 * @remarks
 * Handles API key lifecycle management:
 * - List user's API keys (GET /api/v1/api-keys)
 * - Create new API key (POST /api/v1/api-keys)
 * - Get API key details (GET /api/v1/api-keys/:id)
 * - Revoke API key (DELETE /api/v1/api-keys/:id)
 *
 * **Dependencies:** {@link ApiKeyService}
 *
 * **Authentication:** All endpoints require JWT authentication
 *
 * **Security:**
 * - Full API keys NEVER stored (only hashes)
 * - Plaintext key shown ONLY at creation
 * - Users can only manage their own keys
 */

import { Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/ApiKeyService';
import { AuthRequest } from '../middleware/auth';

/**
 * API Key controller class.
 *
 * @remarks
 * **Ownership:** Users can only access and revoke their own API keys.
 * Ownership verification performed by {@link ApiKeyService}.
 */
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  /**
   * List authenticated user's API keys.
   *
   * @remarks
   * **HTTP Endpoint:** GET /api/v1/api-keys
   *
   * **Authentication:** Requires JWT token
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "name": "Production API",
   *       "keyPrefix": "live_12Ab",
   *       "keyLast4": "Xy89",
   *       "permissions": ["config:read", "config:write"],
   *       "expiresAt": null,
   *       "lastUsedAt": "2025-01-01T00:00:00.000Z",
   *       "createdAt": "2025-01-01T00:00:00.000Z"
   *     }
   *   ],
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Missing or invalid token
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Returns only keys owned by authenticated user
   * - Full keys never exposed (only prefix and last4)
   */
  listApiKeys = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const apiKeys = await this.apiKeyService.listApiKeys(req.user.userId);

      res.status(200).json({
        success: true,
        data: apiKeys,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new API key for authenticated user.
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/api-keys
   *
   * **Authentication:** Requires JWT token
   *
   * **Request Body:**
   * ```json
   * {
   *   "name": "Production API",
   *   "permissions": ["config:read", "config:write"],
   *   "expiresAt": "2026-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Response (201 Created):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "name": "Production API",
   *     "key": "live_12Ab...Xy89",
   *     "keyPrefix": "live_12Ab",
   *     "keyLast4": "Xy89",
   *     "permissions": ["config:read", "config:write"],
   *     "expiresAt": "2026-01-01T00:00:00.000Z",
   *     "lastUsedAt": null,
   *     "createdAt": "2025-01-01T00:00:00.000Z"
   *   },
   *   "message": "API key created. This is the only time you will see the full key.",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Missing or invalid token
   * - 403 Forbidden: User lacks requested permissions
   * - 404 Not Found: User not found
   * - 422 Unprocessable Entity: Validation failed
   * - 500 Internal Server Error: Server error
   *
   * **CRITICAL SECURITY WARNING:**
   * The full `key` field is ONLY returned at creation time.
   * Users MUST save this key securely - it cannot be recovered.
   * After creation, only `keyPrefix` and `keyLast4` are available.
   *
   * **Permission Validation:**
   * API key permissions are validated against user's role.
   * Cannot create key with permissions user doesn't have.
   */
  createApiKey = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { name, permissions, expiresAt } = req.body;

      const apiKey = await this.apiKeyService.createApiKey({
        userId: req.user.userId,
        name,
        permissions,
        expiresAt,
      });

      res.status(201).json({
        success: true,
        data: apiKey,
        message: 'API key created. This is the only time you will see the full key.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('User not found')) {
        res.status(404).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      } else if (err.message?.includes('does not have')) {
        res.status(403).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        next(error);
      }
    }
  };

  /**
   * Get API key details by ID.
   *
   * @remarks
   * **HTTP Endpoint:** GET /api/v1/api-keys/:id
   *
   * **Authentication:** Requires JWT token
   *
   * **Path Parameters:**
   * - `id`: API key unique identifier (UUID)
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "name": "Production API",
   *     "keyPrefix": "live_12Ab",
   *     "keyLast4": "Xy89",
   *     "permissions": ["config:read", "config:write"],
   *     "expiresAt": "2026-01-01T00:00:00.000Z",
   *     "lastUsedAt": "2025-01-01T00:00:00.000Z",
   *     "createdAt": "2025-01-01T00:00:00.000Z"
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Missing API key ID
   * - 401 Unauthorized: Missing or invalid token
   * - 404 Not Found: API key not found
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Full key never exposed (only prefix and last4)
   * - Ownership verification: users can only view their own keys
   */
  getApiKey = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing API key ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // SECURITY: Use getApiKeyForUser to verify ownership
      const apiKey = await this.apiKeyService.getApiKeyForUser(id, req.user.userId);

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: apiKey,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revoke (delete) an API key.
   *
   * @remarks
   * **HTTP Endpoint:** DELETE /api/v1/api-keys/:id
   *
   * **Authentication:** Requires JWT token
   *
   * **Path Parameters:**
   * - `id`: API key unique identifier (UUID)
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "message": "API key revoked successfully",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Missing API key ID
   * - 401 Unauthorized: Missing or invalid token
   * - 404 Not Found: API key not found or permission denied
   * - 500 Internal Server Error: Server error
   *
   * **Ownership Verification:**
   * Users can only revoke their own API keys.
   * Attempting to revoke another user's key returns 404.
   *
   * **Effect:**
   * - API key immediately becomes invalid
   * - Cannot be recovered after revocation
   * - Any applications using this key will fail authentication
   */
  revokeApiKey = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing API key ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.apiKeyService.revokeApiKey(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (
        err.message?.includes('not found') ||
        err.message?.includes('permission')
      ) {
        res.status(404).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        next(error);
      }
    }
  };
}
