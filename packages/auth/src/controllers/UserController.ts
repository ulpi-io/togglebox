/**
 * User management controller for Express routes.
 *
 * @module controllers/UserController
 *
 * @remarks
 * Handles user-related HTTP endpoints:
 * - Profile management (GET/PATCH /api/v1/users/me)
 * - Password changes (POST /api/v1/users/me/password)
 * - User listing (GET /api/v1/users) - Admin only
 * - User details (GET /api/v1/users/:id) - Admin only
 * - User deletion (DELETE /api/v1/users/:id) - Admin only
 *
 * **Dependencies:** {@link UserService}
 *
 * **Authentication:**
 * All endpoints require JWT authentication.
 * Admin-only endpoints should be protected by role middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { AuthRequest } from '../middleware/auth';

/**
 * User management controller class.
 *
 * @remarks
 * **Authorization:**
 * - Profile endpoints: Authenticated user can access their own data
 * - Admin endpoints: Require `admin` role (enforced by middleware)
 *
 * **Validation:** Request body validation performed by middleware.
 */
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Get authenticated user's profile.
   *
   * @remarks
   * **HTTP Endpoint:** GET /api/v1/users/me
   *
   * **Authentication:** Requires JWT token
   *
   * **Response (200 OK):**
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
   * - 401 Unauthorized: Missing or invalid token
   * - 404 Not Found: User no longer exists
   * - 500 Internal Server Error: Server error
   */
  getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await this.userService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update authenticated user's profile.
   *
   * @remarks
   * **HTTP Endpoint:** PATCH /api/v1/users/me
   *
   * **Authentication:** Requires JWT token
   *
   * **Request Body (partial update):**
   * ```json
   * {
   *   "role": "developer"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "email": "user@example.com",
   *     "role": "developer",
   *     "createdAt": "2025-01-01T00:00:00.000Z",
   *     "updatedAt": "2025-01-01T00:00:00.000Z"
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Missing or invalid token
   * - 422 Unprocessable Entity: Validation failed
   * - 500 Internal Server Error: Server error
   *
   * **Security Note:**
   * For password changes, use the dedicated password endpoint instead.
   */
  updateMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await this.userService.updateProfile(req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change authenticated user's password.
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/users/me/password
   *
   * **Authentication:** Requires JWT token
   *
   * **Request Body:**
   * ```json
   * {
   *   "currentPassword": "OldPass123",
   *   "newPassword": "NewSecurePass456"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "message": "Password changed successfully",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Current password incorrect or missing token
   * - 422 Unprocessable Entity: Validation failed (weak password, etc.)
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Requires current password verification
   * - New password hashed with bcrypt before storage
   * - Existing JWT tokens remain valid (consider token rotation)
   */
  changePassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await this.userService.changePassword(
        req.user.userId,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('incorrect')) {
        res.status(401).json({
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
   * Create a new user (admin-only endpoint).
   *
   * @remarks
   * **HTTP Endpoint:** POST /api/v1/users
   *
   * **Authorization:** Admin only (enforced by middleware)
   *
   * **Request Body:**
   * ```json
   * {
   *   "email": "newuser@example.com",
   *   "password": "SecurePass123",
   *   "role": "developer"
   * }
   * ```
   *
   * **Response (201 Created):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "email": "newuser@example.com",
   *     "role": "developer",
   *     "createdAt": "2025-01-01T00:00:00.000Z",
   *     "updatedAt": "2025-01-01T00:00:00.000Z"
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Missing required fields
   * - 401 Unauthorized: Missing or invalid token
   * - 403 Forbidden: Non-admin user
   * - 409 Conflict: User with this email already exists
   * - 422 Unprocessable Entity: Validation failed (weak password, invalid role)
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Password is hashed with bcrypt before storage
   * - Password hash is never returned in response
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Name, email, and password are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate role if provided
      if (role && !['admin', 'developer', 'viewer'].includes(role)) {
        res.status(422).json({
          success: false,
          error: 'Invalid role. Must be admin, developer, or viewer',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Register user via service
      const user = await this.userService.register({
        name,
        email,
        password,
        role: role || 'viewer',
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
        return;
      }
      next(error);
    }
  };

  /**
   * List all users with pagination and filtering.
   *
   * @remarks
   * **HTTP Endpoint:** GET /api/v1/users
   *
   * **Authorization:** Admin only (enforced by middleware)
   *
   * **Query Parameters:**
   * - `limit` (optional): Number of users per page (default: 20, max: 100)
   * - `offset` (optional): Number of users to skip (default: 0)
   * - `role` (optional): Filter by role (e.g., "admin", "developer", "viewer")
   *
   * **Example Request:**
   * ```
   * GET /api/v1/users?limit=10&offset=0&role=developer
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid1",
   *       "email": "user1@example.com",
   *       "role": "developer",
   *       "createdAt": "2025-01-01T00:00:00.000Z",
   *       "updatedAt": "2025-01-01T00:00:00.000Z"
   *     },
   *     {
   *       "id": "uuid2",
   *       "email": "user2@example.com",
   *       "role": "developer",
   *       "createdAt": "2025-01-02T00:00:00.000Z",
   *       "updatedAt": "2025-01-02T00:00:00.000Z"
   *     }
   *   ],
   *   "meta": {
   *     "total": 50,
   *     "limit": 10,
   *     "offset": 0
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 401 Unauthorized: Missing or invalid token
   * - 403 Forbidden: Non-admin user
   * - 500 Internal Server Error: Server error
   */
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Safely parse and clamp limit/offset to valid ranges
      const toPositiveInt = (v: unknown, fallback: number): number => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
      };

      const limit = Math.min(100, Math.max(1, toPositiveInt(req.query['limit'], 20)));
      const offset = Math.max(0, toPositiveInt(req.query['offset'], 0));
      const role = req.query['role'] as string | undefined;

      const result = await this.userService.listUsers({
        limit,
        offset,
        role,
      });

      res.status(200).json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          limit,
          offset,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user details by ID.
   *
   * @remarks
   * **HTTP Endpoint:** GET /api/v1/users/:id
   *
   * **Authorization:** Admin only (enforced by middleware)
   *
   * **Path Parameters:**
   * - `id`: User unique identifier (UUID)
   *
   * **Example Request:**
   * ```
   * GET /api/v1/users/550e8400-e29b-41d4-a716-446655440000
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "550e8400-e29b-41d4-a716-446655440000",
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
   * - 400 Bad Request: Missing user ID
   * - 401 Unauthorized: Missing or invalid token
   * - 403 Forbidden: Non-admin user
   * - 404 Not Found: User does not exist
   * - 500 Internal Server Error: Server error
   */
  getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing user ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await this.userService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user permanently.
   *
   * @remarks
   * **HTTP Endpoint:** DELETE /api/v1/users/:id
   *
   * **Authorization:** Admin only (enforced by middleware)
   *
   * **Path Parameters:**
   * - `id`: User unique identifier (UUID)
   *
   * **Example Request:**
   * ```
   * DELETE /api/v1/users/550e8400-e29b-41d4-a716-446655440000
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "message": "User deleted successfully",
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Missing user ID
   * - 401 Unauthorized: Missing or invalid token
   * - 403 Forbidden: Non-admin user
   * - 404 Not Found: User does not exist (handled by repository)
   * - 500 Internal Server Error: Server error
   *
   * **Cascade Behavior:**
   * Also deletes associated data:
   * - API keys owned by the user
   * - Password reset tokens
   *
   * **Warning:** This operation is irreversible.
   */
  deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing user ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user role.
   *
   * @remarks
   * **HTTP Endpoint:** PATCH /api/v1/users/:id/role
   *
   * **Authorization:** Admin only (enforced by middleware)
   *
   * **Path Parameters:**
   * - `id`: User unique identifier (UUID)
   *
   * **Request Body:**
   * ```json
   * {
   *   "role": "developer"
   * }
   * ```
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "email": "user@example.com",
   *     "role": "developer",
   *     "createdAt": "2025-01-01T00:00:00.000Z",
   *     "updatedAt": "2025-01-01T00:00:00.000Z"
   *   },
   *   "timestamp": "2025-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * **Error Responses:**
   * - 400 Bad Request: Missing user ID or role
   * - 401 Unauthorized: Missing or invalid token
   * - 403 Forbidden: Non-admin user or trying to demote yourself
   * - 404 Not Found: User does not exist
   * - 500 Internal Server Error: Server error
   *
   * **Security:**
   * - Cannot demote yourself (admin cannot remove their own admin role)
   * - Prevents last admin from being demoted
   */
  updateUserRole = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params['id'];
      const { role } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing user ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!role || !['admin', 'developer', 'viewer'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role. Must be admin, developer, or viewer',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Prevent admin from demoting themselves
      if (req.user && req.user.userId === id && role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Cannot demote yourself. Ask another admin to change your role.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // SECURITY: Prevent demoting the last admin user
      if (role !== 'admin') {
        const targetUser = await this.userService.getUserById(id);
        if (targetUser?.role === 'admin') {
          const adminCount = await this.userService.countByRole('admin');
          if (adminCount <= 1) {
            res.status(400).json({
              success: false,
              error: 'Cannot demote the last admin user. Promote another user to admin first.',
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
      }

      const user = await this.userService.updateProfile(id, { role });

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
}
