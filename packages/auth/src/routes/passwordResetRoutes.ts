/**
 * Password reset routes factory.
 *
 * @module routes/passwordResetRoutes
 *
 * @remarks
 * Creates Express router for password reset flow (3 steps):
 * 1. Request reset (POST /request) - Send email with token
 * 2. Verify token (POST /verify) - Optional validation
 * 3. Complete reset (POST /complete) - Set new password
 *
 * **Base Path:** /api/v1/auth/password-reset
 *
 * **Dependencies:**
 * - {@link PasswordResetController} - Request handlers
 * - Zod validation schemas
 *
 * **Authentication:**
 * All routes are PUBLIC (no authentication required).
 * Designed for users who have lost access to their account.
 *
 * **Security Features:**
 * - User enumeration prevention
 * - Token hashing with bcrypt
 * - 1-hour token expiration
 * - Single-use tokens
 *
 * @example
 * ```typescript
 * const passwordResetController = new PasswordResetController(passwordResetService);
 * const passwordResetRoutes = createPasswordResetRoutes(passwordResetController);
 *
 * app.use('/api/v1/auth/password-reset', passwordResetRoutes);
 * ```
 */

import { Router } from 'express';
import { PasswordResetController } from '../controllers/PasswordResetController';
import { validate } from '../validators/authSchemas';
import {
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  passwordResetCompleteSchema,
} from '../validators/authSchemas';

/**
 * Create password reset routes.
 *
 * @param passwordResetController - Password reset controller instance
 * @returns Express Router configured with password reset routes
 *
 * @remarks
 * **Flow:**
 * 1. User submits email → Receives reset link via email
 * 2. (Optional) Frontend verifies token validity
 * 3. User submits new password with token → Password updated
 *
 * **Security:**
 * - Step 1 always returns success (even if email doesn't exist)
 * - Tokens expire after 1 hour
 * - Tokens deleted after successful reset
 * - All user's reset tokens invalidated on completion
 */
export function createPasswordResetRoutes(
  passwordResetController: PasswordResetController
): Router {
  const router = Router();

  /**
   * POST /api/v1/auth/password-reset/request
   *
   * Request password reset email (Step 1).
   *
   * **Middleware:** validate(passwordResetRequestSchema)
   * **Handler:** {@link PasswordResetController.requestReset}
   * **Authentication:** Not required (public)
   * **Security:** Always returns success (user enumeration prevention)
   */
  router.post(
    '/request',
    validate(passwordResetRequestSchema),
    passwordResetController.requestReset
  );

  /**
   * POST /api/v1/auth/password-reset/verify
   *
   * Verify password reset token validity (Step 2 - Optional).
   *
   * **Middleware:** validate(passwordResetVerifySchema)
   * **Handler:** {@link PasswordResetController.verifyToken}
   * **Authentication:** Not required (public)
   * **Purpose:** Frontend can validate token before showing password form
   */
  router.post(
    '/verify',
    validate(passwordResetVerifySchema),
    passwordResetController.verifyToken
  );

  /**
   * POST /api/v1/auth/password-reset/complete
   *
   * Complete password reset with new password (Step 3).
   *
   * **Middleware:** validate(passwordResetCompleteSchema)
   * **Handler:** {@link PasswordResetController.completeReset}
   * **Authentication:** Not required (public)
   * **Effect:** Updates password, deletes ALL user's reset tokens
   */
  router.post(
    '/complete',
    validate(passwordResetCompleteSchema),
    passwordResetController.completeReset
  );

  return router;
}
