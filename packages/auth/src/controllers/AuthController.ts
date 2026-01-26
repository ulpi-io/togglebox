/**
 * Authentication controller for Express routes.
 *
 * @module controllers/AuthController
 *
 * @remarks
 * Handles authentication-related HTTP endpoints:
 * - User registration (POST /api/v1/auth/register)
 * - User login (POST /api/v1/auth/login)
 * - Token refresh (POST /api/v1/auth/refresh)
 *
 * **Dependencies:** {@link UserService}
 *
 * **Response Format:**
 * ```json
 * {
 *   "success": true,
 *   "data": { ... },
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { AuthRequest } from '../middleware/auth';

/**
 * Authentication controller class.
 *
 * @remarks
 * **Validation:** Request body validation should be performed by middleware
 * (e.g., Zod schemas) before reaching these handlers.
 *
 * **Error Handling:** Catches service errors and returns appropriate HTTP status codes.
 */
export class AuthController {
  constructor(private userService: UserService) {}

  /**
   * Register a new user account.
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/auth/register
   *
   * **Request Body:**
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123",
   *   "role": "viewer"
   * }
   * ```
   *
   * **Response (201 Created):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "email": "user@example.com",
   *     "role": "viewer",
   *     "createdAt": "2025-01-01T00:00:00.000Z",
   *     "updatedAt": "2025-01-01T00:00:00.000Z"
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 409 Conflict: Email already exists
   * - 422 Unprocessable Entity: Validation failed (handled by middleware)
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Password is hashed before storage (never stored in plaintext)
   * - PublicUser response excludes passwordHash
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      const user = await this.userService.register({
        name,
        email,
        password,
        role,
      });

      res.status(201).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        next(error);
      }
    }
  };

  /**
   * Authenticate user and generate JWT token.
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/auth/login
   *
   * **Request Body:**
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "user": {
   *       "id": "uuid",
   *       "email": "user@example.com",
   *       "role": "viewer"
   *     },
   *     "token": "eyJhbGciOiJIUzI1NiIs..."
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Invalid email or password
   * - 422 Unprocessable Entity: Validation failed
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Generic error message prevents user enumeration
   * - Password verified with bcrypt (timing-safe comparison)
   * - JWT token signed with secret key
   *
   * **Token Usage:**
   * Include token in Authorization header for protected endpoints:
   * ```
   * Authorization: Bearer <token>
   * ```
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      const result = await this.userService.login({
        email,
        password,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('Invalid email or password')) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          timestamp: new Date().toISOString(),
        });
      } else {
        next(error);
      }
    }
  };

  /**
   * Refresh JWT token with updated user data.
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/auth/refresh
   *
   * **Authentication:** Requires valid JWT token
   *
   * **Request Headers:**
   * ```
   * Authorization: Bearer <token>
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "token": "eyJhbGciOiJIUzI1NiIs...",
   *     "user": {
   *       "id": "uuid",
   *       "email": "user@example.com",
   *       "role": "viewer"
   *     }
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Missing or invalid token
   * - 404 Not Found: User no longer exists
   * - 500 Internal Server Error: Server error
   *
   * **Use Cases:**
   * - Extend session without re-authentication
   * - Get updated user data (role changes, etc.)
   * - Rotate token for security
   *
   * **Security:**
   * - Fetches fresh user data from database
   * - Generates new token with current user state
   * - Old token remains valid until expiration
   */
  refresh = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get fresh user data
      const user = await this.userService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Generate new token (using the user's current data)
      const { generateToken } = await import('../utils/jwt');
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: '', // Not used in token
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      res.status(200).json({
        success: true,
        data: {
          token,
          user,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
