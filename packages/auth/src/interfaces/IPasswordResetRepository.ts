/**
 * Password reset token repository interface for authentication system.
 *
 * @remarks
 * Defines the contract for password reset token operations.
 * Tokens are hashed for security and have expiration times.
 */

import type {
  PasswordResetToken,
  CreatePasswordResetTokenData,
} from "../models/PasswordResetToken";

/**
 * Password Reset Token repository interface.
 *
 * @remarks
 * All database adapters (Prisma, DynamoDB, MongoDB) must implement this interface.
 *
 * **Security Model:**
 * - Tokens are hashed before storage (never store plain tokens)
 * - Tokens have expiration times (typically 1 hour)
 * - Tokens are single-use (deleted after successful reset)
 *
 * **Key Operations:**
 * - Create/read/delete tokens
 * - Hash-based token verification
 * - Automatic expiration cleanup
 */
export interface IPasswordResetRepository {
  /**
   * Creates a new password reset token.
   *
   * @param data - Token data with hashed token value
   * @returns Created token with generated ID and timestamps
   *
   * @remarks
   * Tokens typically expire in 1 hour and are single-use.
   */
  create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken>;

  /**
   * Finds password reset token by unique ID.
   *
   * @returns Token if found, null otherwise
   */
  findById(id: string): Promise<PasswordResetToken | null>;

  /**
   * Finds password reset token by hashed value (for verification).
   *
   * @param tokenHash - SHA-256 hash of the reset token
   * @returns Token if found, null otherwise
   *
   * @remarks
   * Used to verify the token from the password reset link.
   * Check expiration after retrieval.
   */
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Finds all valid (non-expired) tokens for a user.
   *
   * @param userId - User ID
   * @returns Array of valid tokens
   *
   * @remarks
   * Used to check for existing valid tokens before creating new ones.
   */
  findValidByUser(userId: string): Promise<PasswordResetToken[]>;

  /**
   * Deletes a password reset token.
   *
   * @param id - Token ID
   *
   * @remarks
   * Called after successful password reset to invalidate the token.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all tokens for a user.
   *
   * @param userId - User ID
   *
   * @remarks
   * Called after password change to invalidate all pending reset requests.
   */
  deleteByUser(userId: string): Promise<void>;

  /**
   * Deletes all expired tokens (cleanup job).
   *
   * @returns Number of tokens deleted
   *
   * @remarks
   * Should be run periodically (e.g., daily cron job) to clean up old tokens.
   */
  deleteExpired(): Promise<number>;
}
