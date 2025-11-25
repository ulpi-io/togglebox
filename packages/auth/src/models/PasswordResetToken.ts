/**
 * Password Reset Token model and security utilities.
 *
 * @module models/PasswordResetToken
 *
 * @remarks
 * Provides secure password reset token management for forgotten password flows.
 *
 * **Security Model:**
 * - Tokens are hashed with SHA-256 before storage (never store plaintext)
 * - Tokens expire after 1 hour (configurable)
 * - Tokens are single-use (deleted after successful password reset)
 * - Uses cryptographically secure random generation
 *
 * **Flow:**
 * 1. User requests password reset
 * 2. Generate random token with {@link generatePasswordResetToken}
 * 3. Hash token and store with expiration
 * 4. Send plaintext token via email
 * 5. User clicks link with token
 * 6. Verify token hash and expiration
 * 7. Allow password reset
 * 8. Delete token after successful reset
 */

/**
 * Password Reset Token entity with hashed value.
 *
 * @remarks
 * **Security:**
 * - `tokenHash` is SHA-256 hash of plaintext token (used for verification)
 * - Plaintext token is NEVER stored (only sent via email)
 * - Tokens expire after 1 hour by default (see {@link getPasswordResetTokenExpiry})
 * - Tokens are single-use (deleted after password reset)
 */
export interface PasswordResetToken {
  /** Unique token identifier (UUID) */
  id: string;

  /** User who requested the password reset */
  userId: string;

  /** SHA-256 hashed token value (for secure verification) */
  tokenHash: string;

  /** Token expiration time (typically 1 hour from creation) */
  expiresAt: Date;

  /** Timestamp when token was created */
  createdAt: Date;
}

/**
 * Password reset token data for creation (before hashing).
 *
 * @remarks
 * Excludes auto-generated fields: `id`, `createdAt`.
 * The `token` field contains the plaintext token that will be hashed before storage.
 *
 * **Usage:**
 * 1. Generate token with {@link generatePasswordResetToken}
 * 2. Hash the token for `tokenHash` field
 * 3. Set `expiresAt` with {@link getPasswordResetTokenExpiry}
 * 4. Store via repository
 * 5. Send plaintext token via email (never store it)
 */
export type CreatePasswordResetTokenData = Omit<
  PasswordResetToken,
  'id' | 'createdAt'
> & {
  /** Plain text token to be hashed (never stored, only sent via email) */
  token: string;
};

/**
 * Check if a password reset token is expired.
 *
 * @param token - Password reset token to check
 * @returns true if token is expired, false otherwise
 *
 * @remarks
 * Expired tokens should be rejected during verification.
 * A periodic cleanup job should delete expired tokens.
 *
 * @example
 * ```typescript
 * const token: PasswordResetToken = {
 *   expiresAt: new Date('2024-01-01T12:00:00Z'),
 *   // ...
 * };
 * isPasswordResetTokenExpired(token); // true (if current time is after expiration)
 * ```
 */
export function isPasswordResetTokenExpired(token: PasswordResetToken): boolean {
  return new Date() > new Date(token.expiresAt);
}

/**
 * Generate token expiration time (1 hour from now).
 *
 * @returns Expiration date 1 hour in the future
 *
 * @remarks
 * Default expiration is 1 hour for security.
 * Shorter expiration = more secure but worse UX.
 * Longer expiration = better UX but less secure.
 *
 * @example
 * ```typescript
 * const expiresAt = getPasswordResetTokenExpiry();
 * // expiresAt is 1 hour from current time
 * ```
 */
export function getPasswordResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
}

/**
 * Generate a secure random token (before hashing).
 *
 * @returns 64-character hex string (32 random bytes)
 *
 * @remarks
 * **Security:**
 * - Uses cryptographically secure random generation (crypto.getRandomValues or crypto.randomFillSync)
 * - 32 bytes = 256 bits of entropy (very strong)
 * - Returns hex string for URL-safe transmission
 *
 * **Important:** This returns the PLAINTEXT token:
 * - Hash it with SHA-256 before storing in database
 * - Send plaintext via email to user
 * - Never log or store the plaintext token
 *
 * @example
 * ```typescript
 * const plainToken = generatePasswordResetToken();
 * // plainToken: "a3f2d1c9b8e7f6..."  (64 hex chars)
 *
 * // Hash before storage
 * const tokenHash = sha256(plainToken);
 *
 * // Send plaintext via email
 * sendEmail(user.email, `Reset link: /reset?token=${plainToken}`);
 * ```
 */
export function generatePasswordResetToken(): string {
  // Generate 32 random bytes and convert to hex string
  // This will be hashed before storage
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(bytes);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
