/**
 * JWT token generation and verification utilities.
 *
 * @module utils/jwt
 *
 * @remarks
 * Provides JWT (JSON Web Token) functionality for user authentication.
 *
 * **Configuration:**
 * - `JWT_SECRET`: Secret key for signing tokens (from env, MUST be changed in production)
 * - `JWT_EXPIRES_IN`: Token expiration time (default: 24h)
 *
 * **Security:**
 * - Tokens are signed with HS256 (HMAC-SHA256)
 * - Includes user ID, email, and role in payload
 * - Tokens expire after configured time
 * - Always use HTTPS in production to protect tokens in transit
 */

import jwt from "jsonwebtoken";
import { User } from "../models/User";

/**
 * JWT payload interface.
 *
 * @remarks
 * Contains user claims embedded in the JWT token.
 * This data is NOT encrypted, only signed (base64-encoded and verifiable).
 *
 * **Security:** Never include sensitive data like passwords in JWT payload.
 */
export interface JwtPayload {
  /** User unique identifier */
  id: string;

  /** User email address */
  email: string;

  /** User role for authorization */
  role: string;
}

/**
 * JWT secret key for signing and verifying tokens.
 *
 * @remarks
 * **SECURITY REQUIREMENT:** JWT_SECRET environment variable is REQUIRED.
 * Application will throw an error at startup if not set.
 * Use a strong, randomly generated secret (at least 256 bits / 32 characters).
 *
 * @example
 * ```bash
 * # Generate strong secret (Linux/macOS)
 * openssl rand -base64 32
 *
 * # Set environment variable
 * export JWT_SECRET="your-strong-random-secret-here"
 * ```
 *
 * @throws {Error} If JWT_SECRET environment variable is not set
 */
const JWT_SECRET = (() => {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required for authentication. " +
        "Generate a strong secret with: openssl rand -base64 32",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters long for security. " +
        "Generate a strong secret with: openssl rand -base64 32",
    );
  }
  return secret;
})();

/**
 * JWT token expiration time.
 *
 * @remarks
 * Supports formats: `60`, `"2 days"`, `"10h"`, `"7d"`.
 * Default: 24 hours.
 * Shorter expiration = more secure but worse UX (more frequent logins).
 */
const JWT_EXPIRES_IN = process.env["JWT_EXPIRES_IN"] || "24h";

/**
 * JWT issuer claim.
 *
 * @remarks
 * Identifies the principal that issued the JWT.
 * Must match the issuer expected by the API middleware for verification.
 */
const JWT_ISSUER = process.env["JWT_ISSUER"] || "config-service";

/**
 * JWT audience claim.
 *
 * @remarks
 * Identifies the recipients that the JWT is intended for.
 * Must match the audience expected by the API middleware for verification.
 */
const JWT_AUDIENCE = process.env["JWT_AUDIENCE"] || "config-service-api";

/**
 * Generate a JWT token for a user.
 *
 * @param user - User to generate token for
 * @returns Signed JWT token string
 *
 * @remarks
 * Token includes:
 * - User ID, email, and role in payload
 * - Expiration time (configured via JWT_EXPIRES_IN)
 * - Signature for integrity verification
 *
 * @example
 * ```typescript
 * const user: User = { id: '123', email: 'user@example.com', role: 'developer', ... };
 * const token = generateToken(user);
 * // token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 * // Use in Authorization header
 * fetch('/api/protected', {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export function generateToken(user: User): string {
  // Use 'id' field name for compatibility with @togglebox/shared auth middleware
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token.
 *
 * @param token - JWT token string to verify
 * @returns Decoded payload if valid, null if invalid or expired
 *
 * @remarks
 * **Security:**
 * - Only accepts HS256 algorithm (prevents algorithm confusion attacks)
 * - Verifies signature is valid (token was signed with JWT_SECRET)
 * - Checks token has not expired
 * - Validates token format
 *
 * **Algorithm Restriction:**
 * Explicitly restricts to HS256 only, preventing:
 * - "none" algorithm attacks (unsigned tokens)
 * - RSA/ECDSA algorithm confusion attacks
 * - Key confusion attacks
 *
 * Returns null for any verification failure (invalid signature, expired, malformed, wrong algorithm).
 *
 * @example
 * ```typescript
 * const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 * const payload = verifyToken(token);
 *
 * if (payload) {
 *   console.log(`User ${payload.email} authenticated with role ${payload.role}`);
 * } else {
 *   console.log('Invalid or expired token');
 * }
 * ```
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"], // SECURITY: Restrict to HS256 only (prevents algorithm confusion attacks)
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    // SECURITY: Only log detailed debug info in development to prevent sensitive data leakage
    if (process.env["NODE_ENV"] === "development") {
      // Log detailed error for debugging
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[JWT] Verification failed:", errorMessage);

      // Log additional debug info (don't log the full token for security)
      const tokenPreview = token.substring(0, 20) + "...";
      console.error("[JWT] Debug info:", {
        tokenPreview,
        tokenLength: token.length,
        expectedIssuer: JWT_ISSUER,
        expectedAudience: JWT_AUDIENCE,
        secretLength: JWT_SECRET.length,
      });

      // Try to decode token without verification to see the claims
      try {
        const unverifiedPayload = jwt.decode(token);
        if (unverifiedPayload && typeof unverifiedPayload === "object") {
          const payload = unverifiedPayload as Record<string, unknown>;
          console.error("[JWT] Token claims (unverified):", {
            iss: payload["iss"],
            aud: payload["aud"],
            exp: payload["exp"],
            id: payload["id"],
          });
        }
      } catch (decodeError) {
        console.error("[JWT] Could not decode token for debugging");
      }
    }

    return null;
  }
}

/**
 * Decode a JWT token without verification (for debugging).
 *
 * @param token - JWT token string to decode
 * @returns Decoded payload without verification, null if malformed
 *
 * @remarks
 * **WARNING:** This does NOT verify the token signature or expiration.
 * Use only for debugging or inspecting token contents.
 * NEVER use for authentication - always use {@link verifyToken} instead.
 *
 * @example
 * ```typescript
 * const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 * const payload = decodeToken(token);
 *
 * // Inspect token contents (debugging only)
 * console.log(`Token contains: ${JSON.stringify(payload)}`);
 *
 * // ⚠️ DO NOT use for authentication - token may be invalid/expired
 * ```
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
}
