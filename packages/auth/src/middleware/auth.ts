/**
 * Express authentication middleware factory and types.
 *
 * @module middleware/auth
 *
 * @remarks
 * Provides flexible authentication middleware supporting:
 * - JWT token authentication (Authorization: Bearer header)
 * - API key authentication (X-API-Key header)
 * - Role-based access control (RBAC)
 * - Permission-based authorization
 * - Conditional authentication (can be disabled via env)
 *
 * **Authentication Flow:**
 * 1. Extract credentials from headers (JWT or API key)
 * 2. Verify credentials against database
 * 3. Attach user/apiKey to request object
 * 4. Check permissions/roles if required
 *
 * **Environment Variables:**
 * - `ENABLE_AUTHENTICATION`: Set to 'true' to enable auth globally
 * - `AUTH_MODULE_ENABLED`: Alternative flag for enabling auth
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken as verifyJWT } from '../utils/jwt';
import { ApiKeyService } from '../services/ApiKeyService';
import { UserService } from '../services/UserService';
import { USER_PERMISSIONS } from '../models/User';

/**
 * Extended Express Request with authenticated JWT user.
 *
 * @remarks
 * Populated by {@link authenticateJWT} middleware.
 * Contains user claims from verified JWT token.
 */
export interface AuthenticatedRequest extends Request {
  /** User claims from JWT token (populated after authentication) */
  user?: {
    /** User unique identifier */
    userId: string;

    /** User email address */
    email: string;

    /** User role for RBAC */
    role: string;
  };
}

/**
 * Extended Express Request with API key authentication.
 *
 * @remarks
 * Populated by {@link authenticateAPIKey} middleware.
 * Contains API key metadata from database.
 */
export interface ApiKeyRequest extends Request {
  /** API key metadata (populated after authentication) */
  apiKey?: {
    /** API key unique identifier */
    id: string;

    /** Human-readable API key name */
    name: string;

    /** Permissions granted to this API key */
    permissions: string[];

    /** User who owns this API key */
    userId: string;
  };
}

/**
 * Combined authenticated request supporting both JWT and API key auth.
 *
 * @remarks
 * Use this type for routes that accept either authentication method.
 * Check `req.user` for JWT auth or `req.apiKey` for API key auth.
 */
export type AuthRequest = AuthenticatedRequest & ApiKeyRequest;

/**
 * Authentication middleware factory configuration.
 *
 * @remarks
 * Required services for authentication:
 * - **apiKeyService**: For API key verification
 * - **userService**: For JWT user validation
 * - **authEnabled**: Optional override for global auth toggle
 */
export interface AuthConfig {
  /** Service for API key operations */
  apiKeyService: ApiKeyService;

  /** Service for user operations */
  userService: UserService;

  /** Override global auth enabled flag (defaults to env vars) */
  authEnabled?: boolean;
}

/**
 * Create authentication middleware factory.
 *
 * @param config - Authentication configuration with services
 * @returns Object with authentication middleware functions
 *
 * @remarks
 * Factory pattern allows dependency injection of services.
 * Returns middleware functions that can be used in Express routes.
 *
 * **Auth Enabled Detection:**
 * 1. Check `config.authEnabled` override
 * 2. Fall back to `ENABLE_AUTHENTICATION` env var
 * 3. Fall back to `AUTH_MODULE_ENABLED` env var
 * 4. Default: false (auth disabled)
 *
 * @example
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   apiKeyService,
 *   userService,
 *   authEnabled: true
 * });
 *
 * // Require JWT authentication
 * router.get('/protected', authMiddleware.authenticateJWT, (req, res) => {
 *   const user = (req as AuthenticatedRequest).user;
 *   res.json({ message: `Hello ${user?.email}` });
 * });
 *
 * // Require specific permission
 * router.post('/configs',
 *   authMiddleware.authenticate,
 *   authMiddleware.requirePermission('config:write'),
 *   configController.create
 * );
 * ```
 */
export function createAuthMiddleware(config: AuthConfig) {
  const { apiKeyService, userService } = config;
  const authEnabled =
    config.authEnabled ??
    (process.env['ENABLE_AUTHENTICATION'] === 'true' ||
      process.env['AUTH_MODULE_ENABLED'] === 'true');

  /**
   * Authenticate request using JWT token from Authorization header.
   *
   * @param req - Express request (will be extended with user data)
   * @param res - Express response
   * @param next - Express next function
   *
   * @remarks
   * **Expected Header:**
   * ```
   * Authorization: Bearer <jwt-token>
   * ```
   *
   * **Verification Steps:**
   * 1. Extract token from Authorization header
   * 2. Verify token signature and expiration
   * 3. Verify user still exists in database
   * 4. Attach user data to `req.user`
   *
   * **Error Responses:**
   * - 401: Missing/invalid header or expired token
   * - 401: User not found in database
   *
   * @example
   * ```typescript
   * router.get('/profile', authenticateJWT, (req, res) => {
   *   const user = (req as AuthenticatedRequest).user;
   *   res.json({ userId: user?.userId, email: user?.email });
   * });
   * ```
   */
  async function authenticateJWT(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = verifyJWT(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      // Verify user still exists
      const user = await userService.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired JWT token',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Authenticate request using API key from X-API-Key header.
   *
   * @param req - Express request (will be extended with apiKey data)
   * @param res - Express response
   * @param next - Express next function
   *
   * @remarks
   * **Expected Header:**
   * ```
   * X-API-Key: tbx_live_abc123def456...
   * ```
   *
   * **Verification Steps:**
   * 1. Extract API key from X-API-Key header
   * 2. Verify key hash against database
   * 3. Check expiration (if set)
   * 4. Attach API key metadata to `req.apiKey`
   *
   * **Error Responses:**
   * - 401: Missing/invalid header
   * - 401: Invalid or expired API key
   *
   * @example
   * ```typescript
   * router.get('/api/configs', authenticateAPIKey, (req, res) => {
   *   const apiKey = (req as ApiKeyRequest).apiKey;
   *   console.log(`Request from API key: ${apiKey?.name}`);
   *   // ...
   * });
   * ```
   */
  async function authenticateAPIKey(
    req: ApiKeyRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const apiKeyHeader = req.headers['x-api-key'];

    if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid X-API-Key header',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      // Verify API key from database
      const apiKey = await apiKeyService.verifyApiKey(apiKeyHeader);
      if (!apiKey) {
        throw new Error('Invalid API key');
      }

      req.apiKey = {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        userId: apiKey.userId,
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Authenticate using either JWT or API key.
   *
   * @param req - Express request (will be extended with user or apiKey)
   * @param res - Express response
   * @param next - Express next function
   *
   * @remarks
   * **Priority:**
   * 1. Try JWT authentication (Authorization: Bearer header)
   * 2. Try API key authentication (X-API-Key header)
   * 3. Reject if neither provided
   *
   * **Accepted Headers:**
   * - `Authorization: Bearer <jwt>` - JWT authentication
   * - `X-API-Key: <api-key>` - API key authentication
   *
   * Use this middleware for routes that accept either auth method.
   *
   * @example
   * ```typescript
   * router.get('/api/configs', authenticate, (req, res) => {
   *   const authReq = req as AuthRequest;
   *   if (authReq.user) {
   *     console.log(`Authenticated via JWT: ${authReq.user.email}`);
   *   } else if (authReq.apiKey) {
   *     console.log(`Authenticated via API key: ${authReq.apiKey.name}`);
   *   }
   *   // ...
   * });
   * ```
   */
  async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    // Try JWT authentication first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await authenticateJWT(req as AuthenticatedRequest, res, next);
      return;
    }

    // Try API key authentication
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      await authenticateAPIKey(req as ApiKeyRequest, res, next);
      return;
    }

    // No valid authentication provided
    res.status(401).json({
      success: false,
      error: 'Authentication required. Provide either Bearer token or X-API-Key header',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if authenticated request has a specific permission.
   *
   * @param req - Authenticated request (JWT or API key)
   * @param requiredPermission - Permission string in format `resource:action`
   * @returns true if request has permission, false otherwise
   *
   * @remarks
   * **Permission Check Logic:**
   * - **JWT Auth**: Check user role permissions via {@link USER_PERMISSIONS}
   *   - Admin role has ALL permissions automatically
   * - **API Key Auth**: Check API key's permissions array
   *
   * @example
   * ```typescript
   * if (hasPermission(req, 'config:write')) {
   *   // User/API key has write permission
   * }
   * ```
   */
  function hasPermission(req: AuthRequest, requiredPermission: string): boolean {
    // JWT authentication check
    if (req.user) {
      // Admin users have all permissions
      if (req.user.role === 'admin') {
        return true;
      }

      // Check if user role has the required permission
      const permissions = USER_PERMISSIONS[req.user.role as keyof typeof USER_PERMISSIONS] || [];
      return permissions.includes(requiredPermission);
    }

    // API Key authentication check
    if (req.apiKey) {
      return req.apiKey.permissions.includes(requiredPermission);
    }

    return false;
  }

  /**
   * Create middleware that requires a specific permission.
   *
   * @param permission - Required permission in format `resource:action`
   * @returns Express middleware function
   *
   * @remarks
   * **Behavior:**
   * - If permission granted: Call `next()`
   * - If permission denied: Return 403 Forbidden
   *
   * **Prerequisites:**
   * Must be used AFTER authentication middleware (authenticate, authenticateJWT, or authenticateAPIKey).
   *
   * @example
   * ```typescript
   * router.post('/configs',
   *   authenticate,
   *   requirePermission('config:write'),
   *   configController.create
   * );
   *
   * router.delete('/configs/:id',
   *   authenticateJWT,
   *   requirePermission('config:delete'),
   *   configController.delete
   * );
   * ```
   */
  function requirePermission(permission: string) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!hasPermission(req, permission)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
          meta: {
            requiredPermission: permission,
          },
        });
        return;
      }
      next();
    };
  }

  /**
   * Create middleware that requires a specific user role.
   *
   * @param role - Required role (admin, developer, viewer)
   * @returns Express middleware function
   *
   * @remarks
   * **Behavior:**
   * - If user has role: Call `next()`
   * - If user lacks role: Return 403 Forbidden
   *
   * **Note:** Only works with JWT authentication (not API keys).
   * API keys don't have roles, only permissions.
   *
   * @example
   * ```typescript
   * router.delete('/users/:id',
   *   authenticateJWT,
   *   requireRole('admin'),
   *   userController.delete
   * );
   * ```
   */
  function requireRole(role: string) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (req.user && req.user.role !== role) {
        res.status(403).json({
          success: false,
          error: 'Insufficient role',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
          meta: {
            requiredRole: role,
          },
        });
        return;
      }
      next();
    };
  }

  /**
   * Create conditional authentication middleware.
   *
   * @returns Express middleware function
   *
   * @remarks
   * **Behavior:**
   * - If auth enabled: Require authentication (JWT or API key)
   * - If auth disabled: Pass through without authentication
   *
   * **Use Case:**
   * Allows deploying with authentication disabled for testing/development.
   * Controlled by `authEnabled` config or environment variables.
   *
   * @example
   * ```typescript
   * // Auth can be toggled via environment variable
   * router.get('/api/configs',
   *   conditionalAuth(),
   *   configController.list
   * );
   * ```
   */
  function conditionalAuth() {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (authEnabled) {
        await authenticate(req, res, next);
      } else {
        // Authentication is disabled - pass through
        next();
      }
    };
  }

  /**
   * Create conditional permission check middleware.
   *
   * @param permission - Required permission in format `resource:action`
   * @returns Express middleware function
   *
   * @remarks
   * **Behavior:**
   * - If auth enabled: Require permission
   * - If auth disabled: Pass through without check
   *
   * **Use Case:**
   * Consistent with {@link conditionalAuth} for environments where auth is disabled.
   *
   * @example
   * ```typescript
   * router.post('/configs',
   *   conditionalAuth(),
   *   conditionalPermission('config:write'),
   *   configController.create
   * );
   * ```
   */
  function conditionalPermission(permission: string) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (authEnabled) {
        requirePermission(permission)(req, res, next);
      } else {
        // Authentication is disabled - pass through
        next();
      }
    };
  }

  /**
   * Check if authentication is enabled.
   *
   * @returns true if auth is enabled, false otherwise
   *
   * @remarks
   * Useful for conditional logic in application code.
   *
   * @example
   * ```typescript
   * const authMiddleware = createAuthMiddleware(config);
   *
   * if (authMiddleware.isEnabled()) {
   *   console.log('Authentication is enabled');
   * }
   * ```
   */
  function isEnabled(): boolean {
    return authEnabled;
  }

  return {
    authenticate,
    authenticateJWT,
    authenticateAPIKey,
    requirePermission,
    requireRole,
    conditionalAuth,
    conditionalPermission,
    hasPermission,
    isEnabled,
  };
}

/**
 * Authentication middleware return type.
 *
 * @remarks
 * Inferred from {@link createAuthMiddleware} return value.
 * Provides type-safe access to all middleware functions.
 */
export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
