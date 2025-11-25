/**
 * Authentication utility functions.
 *
 * @module utils
 *
 * @remarks
 * Provides cryptographic utilities for authentication:
 * - Password hashing and verification (bcrypt)
 * - JWT token generation and verification
 * - Password reset token generation
 * - API key generation and formatting
 */
export * from './password';
export {
  generateSecureToken,
  hashToken,
  verifyToken,
  generateApiKey,
  getApiKeyPrefix,
  getApiKeyLast4,
} from './token';
export { generateToken, verifyToken as verifyJWT, decodeToken } from './jwt';
export type { JwtPayload } from './jwt';
