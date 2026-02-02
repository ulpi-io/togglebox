/**
 * Secure token generation utilities for password reset and API keys.
 *
 * @module utils/token
 *
 * @remarks
 * Provides cryptographically secure token generation for:
 * - Password reset tokens (64-char hex)
 * - API keys (tbx_live_ or tbx_test_ prefix)
 *
 * **Security:**
 * - Uses Node.js `crypto.randomBytes` (cryptographically secure PRNG)
 * - 32 bytes = 256 bits of entropy (very strong)
 * - Tokens are hashed with bcrypt before storage
 */

import crypto from "crypto";
import bcryptjs from "bcryptjs";

/**
 * Generate a secure random token for password reset.
 *
 * @returns 64-character hex string (32 random bytes)
 *
 * @remarks
 * **Security:**
 * - 32 bytes = 256 bits of entropy (extremely secure)
 * - Uses cryptographically secure random generation
 * - Returns hex-encoded string for URL-safe transmission
 *
 * **Usage:**
 * 1. Generate token with this function
 * 2. Hash token with {@link hashToken} before storage
 * 3. Send plaintext token via email
 * 4. Never log or store the plaintext token
 *
 * @example
 * ```typescript
 * const resetToken = generateSecureToken();
 * // resetToken: "a3f2d1c9b8e7f6d5c4b3a2918273645..." (64 chars)
 *
 * const tokenHash = await hashToken(resetToken);
 * await passwordResetRepository.create({ userId, tokenHash, ... });
 *
 * // Send plaintext token via email
 * sendEmail(user.email, `Reset link: /reset?token=${resetToken}`);
 * ```
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a token using bcrypt for secure storage.
 *
 * @param token - Plain text token to hash
 * @returns Bcrypt hash string
 *
 * @remarks
 * Uses 10 salt rounds (same as password hashing).
 * Tokens should be hashed before storing in database to prevent token theft.
 *
 * @example
 * ```typescript
 * const plainToken = generateSecureToken();
 * const tokenHash = await hashToken(plainToken);
 *
 * await passwordResetRepository.create({
 *   userId,
 *   tokenHash,  // Store hash, not plain token
 *   expiresAt: new Date(Date.now() + 3600000),
 * });
 * ```
 */
export async function hashToken(token: string): Promise<string> {
  return bcryptjs.hash(token, 10);
}

/**
 * Verify a token against a bcrypt hash.
 *
 * @param token - Plain text token to verify
 * @param hash - Bcrypt hash to compare against
 * @returns true if token matches hash, false otherwise
 *
 * @remarks
 * Used to verify password reset tokens from email links.
 * Timing-safe comparison prevents timing attacks.
 *
 * @example
 * ```typescript
 * const tokenFromUrl = req.query.token;
 * const storedToken = await passwordResetRepository.findByUserId(userId);
 *
 * const isValid = await verifyToken(tokenFromUrl, storedToken.tokenHash);
 *
 * if (isValid && storedToken.expiresAt > new Date()) {
 *   // Token is valid and not expired - allow password reset
 *   await userRepository.update(userId, { passwordHash: newPasswordHash });
 * } else {
 *   throw new Error('Invalid or expired reset token');
 * }
 * ```
 */
export async function verifyToken(
  token: string,
  hash: string,
): Promise<boolean> {
  return bcryptjs.compare(token, hash);
}

/**
 * Hash an API key using SHA-256 for deterministic GSI lookup.
 *
 * @param key - Full plaintext API key
 * @returns SHA-256 hex hash string
 *
 * @remarks
 * **CRITICAL:** For API keys, we MUST use deterministic hashing (same input = same output)
 * to enable GSI2 lookup by key hash. bcrypt CANNOT be used because it includes random salt,
 * which produces different hashes each time.
 *
 * **GSI2 Pattern:**
 * - GSI2PK: `APIKEY_HASH#<sha256-hash>`
 * - This allows O(1) lookup by API key during authentication
 *
 * **Security:**
 * - SHA-256 is cryptographically secure and collision-resistant
 * - 256-bit output provides sufficient security for API key lookup
 * - One-way hash prevents key recovery from stored hash
 *
 * @example
 * ```typescript
 * const key = 'tbx_live_a3f2d1c9b8e7f6d5c4b3a291827364';
 * const keyHash = hashApiKey(key);
 * // keyHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
 *
 * // Store in DynamoDB with GSI2:
 * // GSI2PK: 'APIKEY_HASH#8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
 * ```
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Generate an API key with Togglebox format.
 *
 * @param prefix - Environment prefix ('live' for production, 'test' for development)
 * @returns API key in format `tbx_live_<32-random-chars>` or `tbx_test_<32-random-chars>`
 *
 * @remarks
 * **Format:**
 * - Prefix: `tbx_live_` (production) or `tbx_test_` (development)
 * - Random part: 32 hex characters (16 random bytes)
 * - Total length: ~42 characters
 *
 * **Security:**
 * - 16 bytes = 128 bits of entropy (very secure)
 * - Key is hashed with SHA-256 before storage (not bcrypt for API keys)
 * - First 8 chars (prefix) and last 4 chars stored for display
 *
 * @example
 * ```typescript
 * const liveKey = generateApiKey('live');
 * // liveKey: "tbx_live_a3f2d1c9b8e7f6d5c4b3a291827364"
 *
 * const testKey = generateApiKey('test');
 * // testKey: "tbx_test_1234567890abcdef1234567890ab"
 *
 * // Hash before storage
 * const keyHash = sha256(liveKey);
 * const keyPrefix = getApiKeyPrefix(liveKey);  // "tbx_live"
 * const keyLast4 = getApiKeyLast4(liveKey);    // "7364"
 * ```
 */
export function generateApiKey(prefix: "live" | "test" = "live"): string {
  const randomPart = crypto.randomBytes(16).toString("hex"); // 32 chars
  return `tbx_${prefix}_${randomPart}`;
}

/**
 * Extract API key prefix from full key (first 8 characters).
 *
 * @param key - Full API key string
 * @returns First 8 characters for display (e.g., "tbx_live")
 *
 * @remarks
 * Used for display purposes only, NOT for authentication.
 * Helps users identify key type (live vs test) in UI.
 *
 * @example
 * ```typescript
 * const key = 'tbx_live_a3f2d1c9b8e7f6d5c4b3a291827364';
 * getApiKeyPrefix(key); // 'tbx_live'
 * ```
 */
export function getApiKeyPrefix(key: string): string {
  return key.slice(0, 8);
}

/**
 * Extract last 4 characters from full key.
 *
 * @param key - Full API key string
 * @returns Last 4 characters for identification (e.g., "7364")
 *
 * @remarks
 * Used for display purposes only, NOT for authentication.
 * Helps users identify specific keys in UI (e.g., "tbx_live****7364").
 *
 * @example
 * ```typescript
 * const key = 'tbx_live_a3f2d1c9b8e7f6d5c4b3a291827364';
 * getApiKeyLast4(key); // '7364'
 *
 * // Display format
 * const display = `${getApiKeyPrefix(key)}****${getApiKeyLast4(key)}`;
 * // display: 'tbx_live****7364'
 * ```
 */
export function getApiKeyLast4(key: string): string {
  return key.slice(-4);
}
