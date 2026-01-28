/**
 * Express authentication middleware.
 *
 * @module middleware
 *
 * @remarks
 * Exports authentication middleware factory and types:
 * - {@link createAuthMiddleware} - Factory for creating auth middleware
 * - {@link AuthenticatedRequest} - Request type with JWT user data
 * - {@link ApiKeyRequest} - Request type with API key data
 * - {@link AuthRequest} - Combined request type (JWT or API key)
 * - {@link AuthConfig} - Configuration for middleware factory
 * - {@link AuthMiddleware} - Return type of factory
 */
export * from "./auth";
