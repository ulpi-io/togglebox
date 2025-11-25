/**
 * Server actions for password reset verification.
 *
 * @module actions/password-reset
 *
 * @remarks
 * These Next.js server actions handle password reset token verification.
 * Part of the authentication flow for users who forgot their password.
 */
'use server';

import { verifyResetTokenApi } from '@/lib/api/auth';

/**
 * Verifies a password reset token's validity.
 *
 * @param token - Password reset token from email link
 *
 * @returns Promise resolving to verification result with user data or error
 *
 * @remarks
 * **Password Reset Flow:**
 * 1. User clicks "Forgot Password" and enters email
 * 2. System sends email with reset link containing token
 * 3. User clicks link, which loads reset password page
 * 4. This action verifies token before showing password form
 * 5. If valid, user can set new password
 *
 * **Token Expiration:**
 * Reset tokens are typically valid for 1 hour for security.
 * Expired tokens return an error and user must request new reset.
 *
 * **Security:**
 * - Token is single-use (invalidated after password reset)
 * - Token must match user's email and be unexpired
 * - Prevents brute-force attacks with rate limiting on backend
 *
 * @example
 * ```ts
 * const result = await verifyResetTokenAction('abc123def456');
 * if (result.success) {
 *   // Token is valid, show password reset form
 *   console.log('User:', result.data.email);
 * } else {
 *   // Token invalid or expired
 *   console.error(result.error); // "Invalid or expired reset token"
 * }
 * ```
 */
export async function verifyResetTokenAction(
  token: string
): Promise<{ success: boolean; data?: { valid: boolean; email: string }; error?: string }> {
  try {
    const result = await verifyResetTokenApi(token);

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired reset token';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
