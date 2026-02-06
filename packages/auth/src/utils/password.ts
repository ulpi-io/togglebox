/**
 * Password hashing and verification utilities using bcrypt.
 *
 * @module utils/password
 *
 * @remarks
 * Provides secure password hashing with bcrypt for user authentication.
 *
 * **Security:**
 * - Uses bcrypt for password hashing (industry standard)
 * - Salt rounds: 10 (good balance of security and performance)
 * - Automatically handles salting (no need to generate salt separately)
 * - Resistant to rainbow table attacks
 * - Computationally expensive to slow down brute-force attacks
 *
 * **Performance:**
 * - 10 salt rounds ≈ 100-150ms per hash on modern hardware
 * - Intentionally slow to prevent brute-force attacks
 * - Consider async nature when using in request handlers
 */

import bcryptjs from "bcryptjs";

/**
 * Number of salt rounds for bcrypt hashing.
 *
 * @remarks
 * Higher rounds = more secure but slower.
 * - 10 rounds: ~100-150ms (recommended for most applications)
 * - 12 rounds: ~300-400ms (high-security applications)
 * - 8 rounds: ~25-50ms (not recommended, too fast)
 *
 * Each increment doubles the computation time.
 */
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt.
 *
 * @param password - Plain text password to hash
 * @returns Bcrypt hash string (60 characters)
 *
 * @remarks
 * **Security:**
 * - Automatically generates a salt (included in the hash)
 * - Hash format: `$2b$10$...` (algorithm + rounds + salt + hash)
 * - Each call produces a different hash for the same password (different salt)
 *
 * **Performance:** Takes ~100-150ms with 10 salt rounds.
 *
 * @example
 * ```typescript
 * const plainPassword = 'user-password-123';
 * const hash = await hashPassword(plainPassword);
 * // hash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
 *
 * // Store hash in database (never store plain password)
 * await userRepository.create({ email, passwordHash: hash, ... });
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns true if password matches hash, false otherwise
 *
 * @remarks
 * **Security:**
 * - Timing-safe comparison (prevents timing attacks)
 * - Extracts salt from hash automatically
 * - Works with any bcrypt hash (regardless of salt rounds used)
 *
 * **Performance:** Takes ~100-150ms (same as hashing).
 *
 * @example
 * ```typescript
 * const user = await userRepository.findByEmail('user@example.com');
 * const inputPassword = 'user-password-123';
 *
 * const isValid = await verifyPassword(inputPassword, user.passwordHash);
 *
 * if (isValid) {
 *   // Password correct - generate JWT token
 *   const token = generateToken(user);
 * } else {
 *   // Password incorrect - reject login
 *   throw new Error('Invalid credentials');
 * }
 * ```
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}
