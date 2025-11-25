/**
 * Password reset controller for Express routes.
 *
 * @module controllers/PasswordResetController
 *
 * @remarks
 * Implements secure 3-step password reset flow:
 * 1. Request reset (POST /api/v1/auth/password-reset/request)
 * 2. Verify token (POST /api/v1/auth/password-reset/verify)
 * 3. Complete reset (POST /api/v1/auth/password-reset/complete)
 *
 * **Dependencies:** {@link PasswordResetService}
 *
 * **Security Features:**
 * - Tokens hashed with bcrypt
 * - 1-hour token expiration
 * - Single-use tokens (deleted after reset)
 * - User enumeration prevention
 * - Email sent only if user exists
 *
 * **No Authentication Required:**
 * All endpoints are public (password reset flow for locked-out users).
 */

import { Request, Response, NextFunction } from 'express';
import { PasswordResetService } from '../services/PasswordResetService';

/**
 * Password reset controller class.
 *
 * @remarks
 * **Security:**
 * - Step 1 always returns success (even if email doesn't exist)
 * - Step 2 returns generic error for invalid/expired tokens
 * - Step 3 deletes ALL reset tokens for user after successful reset
 */
export class PasswordResetController {
  constructor(private passwordResetService: PasswordResetService) {}

  /**
   * Request password reset (Step 1).
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/auth/password-reset/request
   *
   * **Request Body:**
   * ```json
   * {
   *   "email": "user@example.com"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "message": "If the email exists, a password reset link has been sent",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 422 Unprocessable Entity: Validation failed (invalid email format)
   * - 500 Internal Server Error: Server error
   *
   * **Security - User Enumeration Prevention:**
   * - ALWAYS returns success, even if email doesn't exist
   * - Prevents attackers from discovering valid email addresses
   * - Email sent only if user exists (silent failure otherwise)
   *
   * **Email Content:**
   * Includes password reset link with token:
   * ```
   * {APP_URL}/auth/reset-password?token={token}
   * ```
   *
   * **Token Properties:**
   * - Valid for 1 hour
   * - Single-use (deleted after successful reset)
   * - Hashed before storage (never stored in plaintext)
   */
  requestReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.body;

      await this.passwordResetService.requestPasswordReset({ email });

      // Always return success to prevent user enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify password reset token (Step 2).
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/auth/password-reset/verify
   *
   * **Request Body:**
   * ```json
   * {
   *   "token": "secure-random-token"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "message": "Token is valid",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Invalid or expired token
   * - 422 Unprocessable Entity: Validation failed (missing token)
   * - 500 Internal Server Error: Server error
   *
   * **Purpose:**
   * Optional endpoint to validate token before user submits new password.
   * Provides better UX by catching expired tokens early.
   *
   * **Token Validation:**
   * - Checks if token exists and is hashed correctly
   * - Checks if token is expired (> 1 hour old)
   * - Automatically deletes expired tokens
   * - Returns generic error for security
   *
   * **Use Case:**
   * Frontend can call this before showing password reset form.
   */
  verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.body;

      const isValid = await this.passwordResetService.verifyPasswordResetToken({
        token,
      });

      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired password reset token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete password reset (Step 3).
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/auth/password-reset/complete
   *
   * **Request Body:**
   * ```json
   * {
   *   "token": "secure-random-token",
   *   "newPassword": "NewSecurePass456"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "message": "Password has been reset successfully",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Invalid or expired token
   * - 422 Unprocessable Entity: Validation failed (weak password, etc.)
   * - 500 Internal Server Error: Server error
   *
   * **Process:**
   * 1. Verify token exists and is not expired
   * 2. Hash new password with bcrypt
   * 3. Update user password in database
   * 4. Delete ALL password reset tokens for this user
   *
   * **Security:**
   * - Token is single-use (deleted after successful reset)
   * - All user's reset tokens are invalidated
   * - Password hashed with bcrypt (10 salt rounds)
   * - Existing JWT tokens remain valid (consider token rotation)
   *
   * **After Reset:**
   * - User can immediately login with new password
   * - All reset links become invalid
   * - Consider notifying user via email that password was changed
   */
  completeReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      await this.passwordResetService.completePasswordReset({
        token,
        newPassword,
      });

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (
        err.message?.includes('Invalid') ||
        err.message?.includes('expired')
      ) {
        res.status(400).json({
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
