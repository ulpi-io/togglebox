import { createAuthMiddlewareForApp, DatabaseType } from "@togglebox/auth";

/**
 * Database-backed auth middleware instance.
 *
 * Supports two authentication methods:
 * - JWT tokens (Authorization: Bearer <token>) for admin users
 * - API keys (X-API-Key: <key>) verified via SHA-256 hash lookup in the database
 *
 * Used by both publicRoutes (conditionalAuth) and internalRoutes (requireAuth).
 */
export const authMiddleware = createAuthMiddlewareForApp({
  dbType: (process.env["DB_TYPE"] || "dynamodb") as DatabaseType,
  authEnabled: process.env["ENABLE_AUTHENTICATION"] === "true",
});
