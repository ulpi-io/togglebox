/**
 * Password reset service for forgot password flow.
 *
 * @module services/PasswordResetService
 *
 * @remarks
 * Implements secure 3-step password reset:
 * 1. Request: Generate token, send email
 * 2. Verify: Check token validity
 * 3. Complete: Reset password, invalidate token
 *
 * **Security:**
 * - Tokens hashed with bcrypt
 * - 1-hour expiration
 * - Single-use (deleted after reset)
 * - User enumeration prevention
 */

import { IUserRepository } from '../interfaces/IUserRepository';
import { IPasswordResetRepository } from '../interfaces/IPasswordResetRepository';
import { generateSecureToken, hashToken, verifyToken } from '../utils/token';
import { hashPassword } from '../utils/password';
import {
  getPasswordResetTokenExpiry,
  isPasswordResetTokenExpired,
} from '../models/PasswordResetToken';

/** Password reset request input (step 1). */
export interface PasswordResetRequestData {
  email: string;
}

/** Password reset verification input (step 2). */
export interface PasswordResetVerifyData {
  token: string;
}

/** Password reset completion input (step 3). */
export interface PasswordResetCompleteData {
  token: string;
  newPassword: string;
}

/**
 * Email service interface.
 * @remarks Implemented by {@link EmailService}.
 */
export interface IEmailService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

/**
 * Password reset service.
 *
 * @remarks
 * **Dependencies:** UserRepository, PasswordResetRepository, EmailService
 */
export class PasswordResetService {
  constructor(
    private userRepository: IUserRepository,
    private passwordResetRepository: IPasswordResetRepository,
    private emailService: IEmailService
  ) {}

  /**
   * Request password reset (step 1).
   *
   * @param data - Email address
   *
   * @remarks
   * **Security:** Always returns success (even if email doesn't exist)
   * to prevent user enumeration attacks.
   */
  async requestPasswordReset(data: PasswordResetRequestData): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      // Don't reveal that user doesn't exist for security
      // Just return success to prevent user enumeration
      return;
    }

    // Generate secure token
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);

    // Create password reset token
    await this.passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: getPasswordResetTokenExpiry(),
      token, // This will be removed before storage
    });

    // Send email with token
    await this.emailService.sendPasswordResetEmail(user.email, token);
  }

  /**
   * Verify password reset token (step 2).
   *
   * @param data - Reset token
   * @returns true if valid and not expired
   *
   * @remarks Automatically deletes expired tokens.
   */
  async verifyPasswordResetToken(data: PasswordResetVerifyData): Promise<boolean> {
    const tokenHash = await hashToken(data.token);

    // Find token by hash
    const resetToken = await this.passwordResetRepository.findByTokenHash(tokenHash);
    if (!resetToken) {
      return false;
    }

    // Check if token is expired
    if (isPasswordResetTokenExpired(resetToken)) {
      // Delete expired token
      await this.passwordResetRepository.delete(resetToken.id);
      return false;
    }

    return true;
  }

  /**
   * Complete password reset (step 3).
   *
   * @param data - Reset token and new password
   * @throws {Error} If token invalid or expired
   *
   * @remarks
   * **Process:**
   * 1. Verify token
   * 2. Hash new password
   * 3. Update user password
   * 4. Delete ALL reset tokens for user
   */
  async completePasswordReset(data: PasswordResetCompleteData): Promise<void> {
    const tokenHash = await hashToken(data.token);

    // Find token by hash
    const resetToken = await this.passwordResetRepository.findByTokenHash(tokenHash);
    if (!resetToken) {
      throw new Error('Invalid or expired password reset token');
    }

    // Check if token is expired
    if (isPasswordResetTokenExpired(resetToken)) {
      await this.passwordResetRepository.delete(resetToken.id);
      throw new Error('Password reset token has expired');
    }

    // Verify token
    const isValid = await verifyToken(data.token, resetToken.tokenHash);
    if (!isValid) {
      throw new Error('Invalid password reset token');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(data.newPassword);

    // Update user password
    await this.userRepository.update(resetToken.userId, {
      passwordHash: newPasswordHash,
    });

    // Delete all password reset tokens for this user
    await this.passwordResetRepository.deleteByUser(resetToken.userId);
  }

  /**
   * Clean up expired tokens (for scheduled job).
   *
   * @returns Number of tokens deleted
   *
   * @remarks
   * Run periodically (e.g., daily cron job) to clean up database.
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.passwordResetRepository.deleteExpired();
  }
}
