/**
 * User management routes factory.
 *
 * @module routes/userRoutes
 *
 * @remarks
 * Creates Express router for user management endpoints:
 * - Profile management (GET/PATCH /me)
 * - Password changes (POST /me/password)
 * - User administration (GET/DELETE /, GET/DELETE /:id)
 *
 * **Base Path:** /api/v1/users
 *
 * **Dependencies:**
 * - {@link UserController} - Request handlers
 * - {@link AuthMiddleware} - Authentication and authorization
 * - Zod validation schemas
 *
 * **Authentication:**
 * All routes require JWT authentication.
 * Admin routes additionally require `user:manage` permission.
 *
 * @example
 * ```typescript
 * const userController = new UserController(userService);
 * const authMiddleware = createAuthMiddleware(config);
 * const userRoutes = createUserRoutes(userController, authMiddleware);
 *
 * app.use('/api/v1/users', userRoutes);
 * ```
 */

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { validate } from '../validators/authSchemas';
import {
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/authSchemas';
import { AuthMiddleware } from '../middleware/auth';

/**
 * Create user management routes.
 *
 * @param userController - User controller instance
 * @param authMiddleware - Authentication middleware instance
 * @returns Express Router configured with user routes
 *
 * @remarks
 * **Route Organization:**
 * - Profile routes (/me): Authenticated user accessing own data
 * - Admin routes (/, /:id): Admin users managing all users
 *
 * **Authorization Levels:**
 * - Profile endpoints: Any authenticated user
 * - Admin endpoints: Require `user:manage` permission (admin role)
 */
export function createUserRoutes(
  userController: UserController,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /api/v1/users/me
   *
   * Get authenticated user's profile.
   *
   * **Middleware:** authMiddleware.authenticate
   * **Handler:** {@link UserController.getMe}
   * **Authorization:** Authenticated user
   */
  router.get('/me', authMiddleware.authenticate, userController.getMe);

  /**
   * PATCH /api/v1/users/me
   *
   * Update authenticated user's profile (partial update).
   *
   * **Middleware:** authMiddleware.authenticate, validate(updateProfileSchema)
   * **Handler:** {@link UserController.updateMe}
   * **Authorization:** Authenticated user
   */
  router.patch(
    '/me',
    authMiddleware.authenticate,
    validate(updateProfileSchema),
    userController.updateMe
  );

  /**
   * POST /api/v1/users/me/password
   *
   * Change authenticated user's password.
   *
   * **Middleware:** authMiddleware.authenticate, validate(changePasswordSchema)
   * **Handler:** {@link UserController.changePassword}
   * **Authorization:** Authenticated user
   * **Security:** Requires current password verification
   */
  router.post(
    '/me/password',
    authMiddleware.authenticate,
    validate(changePasswordSchema),
    userController.changePassword
  );

  /**
   * GET /api/v1/users
   *
   * List all users with pagination and filtering.
   *
   * **Middleware:** authMiddleware.authenticate, authMiddleware.requirePermission('user:manage')
   * **Handler:** {@link UserController.listUsers}
   * **Authorization:** Admin only (user:manage permission)
   */
  router.get(
    '/',
    authMiddleware.authenticate,
    authMiddleware.requirePermission('user:manage'),
    userController.listUsers
  );

  /**
   * GET /api/v1/users/:id
   *
   * Get user details by ID.
   *
   * **Middleware:** authMiddleware.authenticate, authMiddleware.requirePermission('user:manage')
   * **Handler:** {@link UserController.getUserById}
   * **Authorization:** Admin only (user:manage permission)
   */
  router.get(
    '/:id',
    authMiddleware.authenticate,
    authMiddleware.requirePermission('user:manage'),
    userController.getUserById
  );

  /**
   * DELETE /api/v1/users/:id
   *
   * Delete user permanently.
   *
   * **Middleware:** authMiddleware.authenticate, authMiddleware.requirePermission('user:manage')
   * **Handler:** {@link UserController.deleteUser}
   * **Authorization:** Admin only (user:manage permission)
   * **Warning:** Irreversible operation
   */
  router.delete(
    '/:id',
    authMiddleware.authenticate,
    authMiddleware.requirePermission('user:manage'),
    userController.deleteUser
  );

  /**
   * PATCH /api/v1/users/:id/role
   *
   * Update user role.
   *
   * **Middleware:** authMiddleware.authenticate, authMiddleware.requirePermission('user:manage')
   * **Handler:** {@link UserController.updateUserRole}
   * **Authorization:** Admin only (user:manage permission)
   * **Security:** Cannot demote yourself
   */
  router.patch(
    '/:id/role',
    authMiddleware.authenticate,
    authMiddleware.requirePermission('user:manage'),
    userController.updateUserRole
  );

  return router;
}
