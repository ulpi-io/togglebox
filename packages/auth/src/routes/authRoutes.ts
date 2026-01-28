/**
 * Authentication routes factory.
 *
 * @module routes/authRoutes
 *
 * @remarks
 * Creates Express router for authentication endpoints:
 * - User registration (POST /register)
 * - User login (POST /login)
 * - Token refresh (POST /refresh)
 *
 * **Base Path:** /api/v1/auth
 *
 * **Dependencies:**
 * - {@link AuthController} - Request handlers
 * - {@link AuthMiddleware} - Authentication middleware
 * - Zod validation schemas (registerSchema, loginSchema)
 *
 * **Middleware Stack:**
 * - Validation middleware for request body
 * - Authentication middleware for protected endpoints
 *
 * @example
 * ```typescript
 * const authController = new AuthController(userService);
 * const authMiddleware = createAuthMiddleware(config);
 * const authRoutes = createAuthRoutes(authController, authMiddleware);
 *
 * app.use('/api/v1/auth', authRoutes);
 * ```
 */

import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { validate } from "../validators/authSchemas";
import { registerSchema, loginSchema } from "../validators/authSchemas";
import { AuthMiddleware } from "../middleware/auth";

/**
 * Create authentication routes.
 *
 * @param authController - Authentication controller instance
 * @param authMiddleware - Authentication middleware instance
 * @returns Express Router configured with authentication routes
 *
 * @remarks
 * **Route Definitions:**
 * - POST /register: Register new user (public)
 * - POST /login: Authenticate and get JWT token (public)
 * - POST /refresh: Refresh JWT with updated user data (protected)
 *
 * **Validation:**
 * Each route validates request body with Zod schemas before reaching controller.
 *
 * **Security:**
 * - /register and /login are public (no authentication required)
 * - /refresh requires valid JWT token
 */
export function createAuthRoutes(
  authController: AuthController,
  authMiddleware: AuthMiddleware,
): Router {
  const router = Router();

  /**
   * POST /api/v1/auth/register
   *
   * Register a new user with email and password.
   *
   * **Middleware:** validate(registerSchema)
   * **Handler:** {@link AuthController.register}
   * **Authentication:** Not required
   */
  router.post("/register", validate(registerSchema), authController.register);

  /**
   * POST /api/v1/auth/login
   *
   * Authenticate user and generate JWT token.
   *
   * **Middleware:** validate(loginSchema)
   * **Handler:** {@link AuthController.login}
   * **Authentication:** Not required
   */
  router.post("/login", validate(loginSchema), authController.login);

  /**
   * POST /api/v1/auth/refresh
   *
   * Refresh JWT token with updated user data.
   *
   * **Middleware:** authMiddleware.authenticate
   * **Handler:** {@link AuthController.refresh}
   * **Authentication:** Required (JWT)
   */
  router.post("/refresh", authMiddleware.authenticate, authController.refresh);

  return router;
}
