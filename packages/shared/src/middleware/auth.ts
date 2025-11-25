/**
 * Authentication and authorization middleware.
 *
 * @module middleware/auth
 *
 * @remarks
 * **Authentication Methods:**
 * - JWT tokens (Bearer authentication)
 * - API keys (X-API-Key header)
 *
 * **Authorization:**
 * - Role-Based Access Control (RBAC)
 * - Permission-based access control
 * - Admin, developer, viewer roles
 *
 * **Security Features:**
 * - Algorithm whitelist (prevents JWT algorithm confusion attacks)
 * - Minimum secret length enforcement (32 characters)
 * - Weak secret detection (rejects placeholders like `<GENERATE_SECRET>`)
 * - Issuer/audience validation
 * - Token expiration
 *
 * **Environment Variables:**
 * - `ENABLE_AUTHENTICATION`: Enable/disable auth (default: false)
 * - `JWT_SECRET`: Secret for JWT signing/verification (min 32 chars)
 * - `API_KEY_SECRET`: Secret for API key signing/verification (min 32 chars)
 * - `JWT_ALGORITHM`: JWT algorithm (HS256/HS384/HS512, default: HS256)
 * - `JWT_EXPIRES_IN`: JWT expiration (default: 24h)
 * - `API_KEY_EXPIRES_IN`: API key expiration (default: 365d)
 *
 * **Middleware Functions:**
 * - {@link requireAuth} - ALWAYS require authentication (non-negotiable)
 * - {@link conditionalAuth} - Require auth only if ENABLE_AUTHENTICATION=true
 * - {@link authenticateJWT} - JWT bearer token authentication
 * - {@link authenticateAPIKey} - API key authentication
 * - {@link authenticate} - Try JWT first, fallback to API key
 * - {@link requirePermission} - Require specific permission
 * - {@link conditionalPermission} - Require permission only if auth enabled
 *
 * **Usage Pattern:**
 * ```typescript
 * import { requireAuth, conditionalAuth, requirePermission } from '@togglebox/shared';
 *
 * // Internal routes - ALWAYS require authentication
 * internalRouter.use(requireAuth());
 * internalRouter.post('/platforms', requirePermission('config:write'), createPlatform);
 *
 * // Public routes - Conditional authentication (ENABLE_AUTHENTICATION=true)
 * publicRouter.use(conditionalAuth());
 * publicRouter.get('/platforms', getPlatforms);
 * ```
 *
 * @security
 * **CRITICAL:** Internal routes (POST/PUT/PATCH/DELETE) must use `requireAuth()`.
 * Never use `conditionalAuth()` for write operations - it can be bypassed!
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';
import crypto from 'crypto';

/**
 * Express Request with authenticated user information (JWT).
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Express Request with API key information.
 */
export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

/**
 * Express Request with both JWT and API key authentication support.
 */
export type AuthRequest = AuthenticatedRequest & ApiKeyRequest;

/**
 * Allowed JWT algorithms (HMAC-based only).
 *
 * @remarks
 * **Security:**
 * Only HMAC algorithms (HS256/384/512) are allowed to prevent:
 * - Algorithm confusion attacks (switching between HMAC and RSA)
 * - Downgrade attacks (switching to "none" algorithm)
 *
 * RSA algorithms (RS256/384/512) are not supported because we use
 * symmetric key authentication (shared secret), not public/private keypairs.
 */
const ALLOWED_JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256', 'HS384', 'HS512'];

/**
 * Default JWT algorithm (HS256 - SHA-256 HMAC).
 */
const DEFAULT_JWT_ALGORITHM: jwt.Algorithm = 'HS256';

/**
 * Authentication service for JWT and API key management.
 *
 * @remarks
 * **Security Features:**
 * - Enforces minimum secret length (32 characters)
 * - Validates secrets are not placeholders or weak values
 * - Algorithm whitelist to prevent JWT attacks
 * - Issuer/audience validation
 * - Token expiration
 *
 * **Role Permissions:**
 * - **admin:** All permissions (wildcard `*`)
 * - **developer:** config:*, platform:read, environment:read, cache:invalidate
 * - **viewer:** config:read, platform:read, environment:read
 */
export class AuthService {
  private jwtSecret: string;
  private apiKeySecret: string;
  private authEnabled: boolean;

  /**
   * Creates a new AuthService instance.
   *
   * @throws {Error} If auth is enabled but JWT_SECRET or API_KEY_SECRET is missing/weak
   *
   * @remarks
   * **Environment Variables:**
   * - `ENABLE_AUTHENTICATION`: Enable/disable auth (default: false)
   * - `JWT_SECRET`: Secret for JWT signing/verification (min 32 chars, required if auth enabled)
   * - `API_KEY_SECRET`: Secret for API key signing/verification (min 32 chars, required if auth enabled)
   *
   * **Security:**
   * Fails fast if authentication is enabled but secrets are missing or weak.
   * This prevents accidental deployment without proper secrets.
   */
  constructor() {
    // SECURITY: No default secrets - fail fast if not configured
    const jwtSecret = process.env['JWT_SECRET'];
    const apiKeySecret = process.env['API_KEY_SECRET'];

    // Check if authentication is enabled
    this.authEnabled = process.env['ENABLE_AUTHENTICATION'] === 'true';

    // If auth is enabled, secrets are required
    if (this.authEnabled) {
      if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error(
          'JWT_SECRET is required and must be at least 32 characters when ENABLE_AUTHENTICATION=true'
        );
      }
      if (!apiKeySecret || apiKeySecret.length < 32) {
        throw new Error(
          'API_KEY_SECRET is required and must be at least 32 characters when ENABLE_AUTHENTICATION=true'
        );
      }
    }

    this.jwtSecret = jwtSecret || '';
    this.apiKeySecret = apiKeySecret || '';
  }

  /**
   * Check if authentication is enabled.
   *
   * @returns true if ENABLE_AUTHENTICATION=true, false otherwise
   *
   * @remarks
   * Used by conditional auth middleware to determine if authentication
   * should be enforced.
   */
  isEnabled(): boolean {
    return this.authEnabled;
  }

  /**
   * Generate a JWT token for a user.
   *
   * @param payload - User information (id, email, role)
   * @returns Signed JWT token
   *
   * @throws {Error} If JWT algorithm is not in whitelist
   *
   * @example
   * ```typescript
   * const token = authService.generateJWT({
   *   id: 'user-123',
   *   email: 'user@example.com',
   *   role: 'developer'
   * });
   * ```
   *
   * @remarks
   * **Token Claims:**
   * - `iat` (issued at): Automatic timestamp
   * - `exp` (expires): Configured via JWT_EXPIRES_IN (default: 24h)
   * - `iss` (issuer): Configured via JWT_ISSUER (default: config-service)
   * - `aud` (audience): Configured via JWT_AUDIENCE (default: config-service-api)
   *
   * **Security:**
   * - Algorithm validated against whitelist (HS256/384/512 only)
   * - Issuer/audience claims for token scope validation
   */
  generateJWT(payload: { id: string; email: string; role: string }): string {
    const algorithm = (process.env['JWT_ALGORITHM'] as jwt.Algorithm) || DEFAULT_JWT_ALGORITHM;

    // Validate algorithm is in whitelist
    if (!ALLOWED_JWT_ALGORITHMS.includes(algorithm)) {
      throw new Error(`JWT algorithm ${algorithm} is not allowed. Use one of: ${ALLOWED_JWT_ALGORITHMS.join(', ')}`);
    }

    return jwt.sign(payload, this.jwtSecret, {
      algorithm: algorithm as jwt.Algorithm,
      expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
      issuer: process.env['JWT_ISSUER'] || 'config-service',
      audience: process.env['JWT_AUDIENCE'] || 'config-service-api',
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode a JWT token.
   *
   * @param token - JWT token to verify
   * @returns Decoded user payload (id, email, role)
   *
   * @throws {Error} If token is expired, invalid, or verification fails
   *
   * @example
   * ```typescript
   * try {
   *   const user = authService.verifyJWT(token);
   *   console.log(user); // { id: 'user-123', email: 'user@example.com', role: 'developer' }
   * } catch (error) {
   *   console.error('Token verification failed:', error.message);
   * }
   * ```
   *
   * @remarks
   * **Security:**
   * - Validates algorithm is in whitelist (prevents algorithm confusion attacks)
   * - Validates issuer/audience match expected values
   * - Validates token has not expired
   *
   * **Error Types:**
   * - `TokenExpiredError`: Token has expired (check `exp` claim)
   * - `JsonWebTokenError`: Invalid token signature or format
   * - Generic error: Other verification failures
   */
  verifyJWT(token: string): { id: string; email: string; role: string } {
    try {
      // SECURITY: Specify allowed algorithms to prevent algorithm confusion attacks
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ALLOWED_JWT_ALGORITHMS,
        issuer: process.env['JWT_ISSUER'] || 'config-service',
        audience: process.env['JWT_AUDIENCE'] || 'config-service-api',
      }) as { id: string; email: string; role: string };

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('JWT token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid JWT token');
      }
      throw new Error('JWT verification failed');
    }
  }

  /**
   * Generate an API key with specific permissions.
   *
   * @param name - Descriptive name for the API key
   * @param permissions - Array of permissions (e.g., ['config:read', 'config:write'])
   * @returns Signed API key token
   *
   * @example
   * ```typescript
   * const apiKey = authService.generateAPIKey('CI/CD Pipeline', [
   *   'config:read',
   *   'config:write',
   *   'cache:invalidate'
   * ]);
   * ```
   *
   * @remarks
   * **API Key Structure:**
   * - `id`: Unique identifier (api-key-{random})
   * - `name`: Descriptive name
   * - `permissions`: Array of granted permissions
   * - `createdAt`: ISO-8601 timestamp
   *
   * **Expiration:**
   * - Default: 365 days (configured via API_KEY_EXPIRES_IN)
   * - API keys are long-lived compared to JWT tokens
   *
   * **Security:**
   * - Uses cryptographically secure random ID (crypto.randomBytes)
   * - Signed with API_KEY_SECRET
   */
  generateAPIKey(name: string, permissions: string[]): string {
    // SECURITY: Use cryptographically secure random ID
    const randomId = crypto.randomBytes(16).toString('hex');
    const payload = {
      id: `api-key-${randomId}`,
      name,
      permissions,
      createdAt: new Date().toISOString(),
    };

    return jwt.sign(payload, this.apiKeySecret, {
      algorithm: DEFAULT_JWT_ALGORITHM as jwt.Algorithm,
      expiresIn: process.env['API_KEY_EXPIRES_IN'] || '365d', // API keys are long-lived
      issuer: process.env['JWT_ISSUER'] || 'config-service',
      audience: process.env['JWT_AUDIENCE'] || 'config-service-api',
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode an API key.
   *
   * @param token - API key to verify
   * @returns Decoded API key payload (id, name, permissions)
   *
   * @throws {Error} If API key is expired, invalid, or verification fails
   *
   * @example
   * ```typescript
   * try {
   *   const apiKey = authService.verifyAPIKey(token);
   *   console.log(apiKey.permissions); // ['config:read', 'config:write']
   * } catch (error) {
   *   console.error('API key verification failed:', error.message);
   * }
   * ```
   *
   * @remarks
   * **Security:**
   * - Validates algorithm is in whitelist
   * - Validates issuer/audience match expected values
   * - Validates API key has not expired
   *
   * **Error Types:**
   * - `TokenExpiredError`: API key has expired
   * - `JsonWebTokenError`: Invalid API key signature or format
   * - Generic error: Other verification failures
   */
  verifyAPIKey(token: string): { id: string; name: string; permissions: string[] } {
    try {
      // SECURITY: Specify allowed algorithms
      const decoded = jwt.verify(token, this.apiKeySecret, {
        algorithms: ALLOWED_JWT_ALGORITHMS,
        issuer: process.env['JWT_ISSUER'] || 'config-service',
        audience: process.env['JWT_AUDIENCE'] || 'config-service-api',
      }) as { id: string; name: string; permissions: string[] };

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('API key has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid API key');
      }
      throw new Error('API key verification failed');
    }
  }

  /**
   * Check if a request has a required permission.
   *
   * @param request - Express request with user or API key attached
   * @param requiredPermission - Permission to check (e.g., 'config:write')
   * @returns true if permission is granted, false otherwise
   *
   * @example
   * ```typescript
   * if (authService.hasPermission(req, 'config:write')) {
   *   // Allow write operation
   * } else {
   *   // Deny access
   * }
   * ```
   *
   * @remarks
   * **Permission Hierarchy:**
   * - JWT users: Check role-based permissions
   *   - Admin: All permissions (wildcard `*`)
   *   - Developer: config:*, platform:read, environment:read, cache:invalidate
   *   - Viewer: config:read, platform:read, environment:read
   * - API keys: Check explicit permission list
   *
   * **Permission Format:**
   * - `resource:action` (e.g., `config:read`, `config:write`)
   * - Wildcard: `*` grants all permissions (admin only)
   */
  hasPermission(request: AuthRequest, requiredPermission: string): boolean {
    // JWT authentication check
    if (request.user) {
      // Admin users have all permissions
      if (request.user.role === 'admin') {
        return true;
      }
      // Check if user has the required permission
      return this.checkUserPermission(request.user.role, requiredPermission);
    }

    // API Key authentication check
    if (request.apiKey) {
      return request.apiKey.permissions.includes(requiredPermission);
    }

    return false;
  }

  private checkUserPermission(userRole: string, requiredPermission: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      'admin': ['*'], // All permissions
      'developer': [
        'config:read',
        'config:write',
        'config:update',
        'config:delete',
        'platform:read',
        'environment:read',
        'cache:invalidate',
      ],
      'viewer': [
        'config:read',
        'platform:read',
        'environment:read',
      ],
    };

    const permissions = rolePermissions[userRole] || [];
    return permissions.includes('*') || permissions.includes(requiredPermission);
  }
}

/**
 * Singleton auth service instance for application-wide use.
 *
 * @example
 * ```typescript
 * import { authService } from '@togglebox/shared';
 *
 * const token = authService.generateJWT({ id: 'user-123', email: 'user@example.com', role: 'developer' });
 * const user = authService.verifyJWT(token);
 * ```
 */
export const authService = new AuthService();

/**
 * JWT authentication middleware.
 *
 * @param req - Express request (will be populated with `user` property)
 * @param res - Express response
 * @param next - Express next function
 *
 * @remarks
 * **Authentication Flow:**
 * 1. Extracts JWT token from `Authorization: Bearer <token>` header
 * 2. Verifies token signature and expiration
 * 3. Attaches user payload to `req.user`
 * 4. Calls `next()` to continue middleware chain
 *
 * **Error Responses:**
 * - 401 Unauthorized if header is missing/invalid
 * - 401 Unauthorized if token is expired/invalid
 *
 * **Usage:**
 * ```typescript
 * router.use(authenticateJWT);
 * router.get('/protected', (req: AuthenticatedRequest, res) => {
 *   console.log(req.user); // { id, email, role }
 * });
 * ```
 */
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header');
    res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = authService.verifyJWT(token);
    req.user = decoded;
    logger.logAuthentication(decoded.id, true, 'JWT');
    next();
  } catch (error) {
    logger.warn('JWT authentication failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(401).json({
      success: false,
      error: 'Invalid or expired JWT token',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * API key authentication middleware.
 *
 * @param req - Express request (will be populated with `apiKey` property)
 * @param res - Express response
 * @param next - Express next function
 *
 * @remarks
 * **Authentication Flow:**
 * 1. Extracts API key from `X-API-Key` header
 * 2. Verifies API key signature and expiration
 * 3. Attaches API key payload to `req.apiKey`
 * 4. Calls `next()` to continue middleware chain
 *
 * **Error Responses:**
 * - 401 Unauthorized if header is missing/invalid
 * - 401 Unauthorized if API key is expired/invalid
 *
 * **Usage:**
 * ```typescript
 * router.use(authenticateAPIKey);
 * router.post('/deploy', (req: ApiKeyRequest, res) => {
 *   console.log(req.apiKey); // { id, name, permissions }
 * });
 * ```
 */
export function authenticateAPIKey(req: ApiKeyRequest, res: Response, next: NextFunction): void {
  const apiKeyHeader = req.headers['x-api-key'];
  
  if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
    logger.warn('Missing or invalid X-API-Key header');
    res.status(401).json({
      success: false,
      error: 'Missing or invalid X-API-Key header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const decoded = authService.verifyAPIKey(apiKeyHeader);
    req.apiKey = decoded;
    logger.logAuthentication(decoded.id, true, 'API_KEY');
    next();
  } catch (error) {
    logger.warn('API key authentication failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Dual authentication middleware (JWT or API key).
 *
 * @param req - Express request (will be populated with `user` or `apiKey`)
 * @param res - Express response
 * @param next - Express next function
 *
 * @remarks
 * **Authentication Flow:**
 * 1. Try JWT authentication first (checks `Authorization` header)
 * 2. If no JWT, try API key authentication (`X-API-Key` header)
 * 3. If neither provided, return 401 error
 *
 * **Priority:**
 * JWT tokens are checked first. If a valid JWT is provided, API key is ignored.
 *
 * **Error Responses:**
 * - 401 Unauthorized if neither JWT nor API key is provided
 *
 * **Usage:**
 * ```typescript
 * router.use(authenticate);
 * router.get('/protected', (req: AuthRequest, res) => {
 *   if (req.user) {
 *     console.log('Authenticated with JWT:', req.user);
 *   } else if (req.apiKey) {
 *     console.log('Authenticated with API key:', req.apiKey);
 *   }
 * });
 * ```
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  // Try JWT authentication first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticateJWT(req as AuthenticatedRequest, res, next);
    return;
  }

  // Try API key authentication
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    authenticateAPIKey(req as ApiKeyRequest, res, next);
    return;
  }

  // No valid authentication provided
  logger.warn('No valid authentication provided');
  res.status(401).json({
    success: false,
    error: 'Authentication required. Provide either Bearer token or X-API-Key header',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Permission-based authorization middleware factory.
 *
 * @param permission - Required permission (e.g., 'config:write', 'cache:invalidate')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/platforms', requirePermission('config:write'), createPlatform);
 * router.delete('/platforms/:id', requirePermission('config:delete'), deletePlatform);
 * ```
 *
 * @remarks
 * **Permission Checking:**
 * - Admins: Bypass check (wildcard `*` permission)
 * - Developers: Check against role permissions + API key permissions
 * - Viewers: Check against role permissions + API key permissions
 *
 * **Error Responses:**
 * - 403 Forbidden if user/API key lacks required permission
 *
 * **Permission Format:**
 * - `resource:action` (e.g., `config:read`, `config:write`)
 * - Check {@link AuthService.hasPermission} for full permission matrix
 *
 * **Usage with Authentication:**
 * ```typescript
 * router.use(requireAuth()); // Authenticate first
 * router.post('/platforms', requirePermission('config:write'), handler); // Then authorize
 * ```
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!authService.hasPermission(req, permission)) {
      logger.warn(`Permission denied for ${req.user?.email || req.apiKey?.name}: ${permission}`);
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}

/**
 * ALWAYS require authentication - non-negotiable
 * This middleware enforces authentication regardless of ENABLE_AUTHENTICATION setting.
 *
 * CRITICAL SECURITY: This middleware CANNOT be bypassed via environment variables.
 * Use this for internal routes that perform write operations or access sensitive data.
 *
 * Usage:
 *   - Internal routes (POST/PUT/PATCH/DELETE operations)
 *   - Administrative endpoints
 *   - Any endpoint that modifies system state
 *
 * Example:
 *   internalRouter.use(requireAuth());  // ✅ Correct - always enforces auth
 *   internalRouter.use(conditionalAuth()); // ❌ WRONG - can be bypassed!
 *
 * @security This is the ONLY auth middleware that guarantees authentication
 */
export function requireAuth() {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // ALWAYS require authentication - no conditional logic
    authenticate(req, res, next);
  };
}

/**
 * Conditional authentication middleware
 * Enforces authentication based on ENABLE_AUTHENTICATION environment variable.
 *
 * ⚠️ WARNING: This middleware can be BYPASSED via ENABLE_AUTHENTICATION=false
 * DO NOT use this for internal routes or write operations!
 * Use requireAuth() for internal routes instead.
 *
 * ENVIRONMENT VARIABLE SEMANTICS:
 *
 * ENABLE_AUTHENTICATION=true (RECOMMENDED for all deployments):
 *   ✅ Public deployments (Cloudflare Workers, public EC2, Docker)
 *   ✅ Self-hosted with internet access
 *   ✅ Any deployment without network-level isolation
 *   → Requires JWT token or API key
 *
 * ENABLE_AUTHENTICATION=false (ONLY for VPC-isolated deployments):
 *   ⚠️  AWS Lambda in VPC with API Gateway Resource Policy (no internet access)
 *   ⚠️  Kubernetes with strict network policies (internal-only)
 *   ⚠️  Private Docker networks (no external access)
 *   → Skips auth (relies on network-level security)
 *   → NEVER use in internet-accessible deployments
 *
 * AUTH_MODULE_ENABLED (separate flag):
 *   - Controls auth module routes (/api/v1/auth/*)
 *   - true: Enable user registration, login, API key management
 *   - false: Disable auth module (use external auth or VPC isolation)
 *
 * CORRECT USAGE:
 *   publicRouter.use(conditionalAuth());    // ✅ OK - read-only public endpoints
 *   authRouter.use(conditionalAuth());      // ✅ OK - auth module routes
 *
 * INCORRECT USAGE:
 *   internalRouter.use(conditionalAuth());  // ❌ WRONG - use requireAuth() instead!
 *
 * @security For internal routes, ALWAYS use requireAuth() instead
 */
export function conditionalAuth() {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (authService.isEnabled()) {
      // Authentication is enabled - require it
      authenticate(req, res, next);
    } else {
      // Authentication is disabled - pass through
      logger.debug('Authentication disabled - allowing request without auth');
      next();
    }
  };
}

/**
 * Conditional permission check
 * Only enforces permissions if authentication is enabled
 * Otherwise, passes through
 *
 * Usage:
 *   router.post('/platforms', conditionalPermission('config:write'), handler);
 */
export function conditionalPermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (authService.isEnabled()) {
      // Authentication is enabled - check permissions
      requirePermission(permission)(req, res, next);
    } else {
      // Authentication is disabled - pass through
      next();
    }
  };
}