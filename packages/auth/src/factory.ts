/**
 * Authentication module factory.
 *
 * @module factory
 *
 * @remarks
 * Provides factory functions to create fully configured authentication routers and middleware.
 *
 * **Main Functions:**
 * - {@link createAuthRouter} - Complete auth router with all endpoints
 * - {@link createAuthMiddlewareForApp} - Standalone middleware for protecting routes
 * - {@link createAuthRepositories} - Repository factory for custom setups
 *
 * **Multi-Database Support:**
 * Automatically selects appropriate database adapter based on configuration:
 * - DynamoDB: AWS Lambda deployments
 * - MySQL/PostgreSQL/SQLite: Prisma adapter
 * - MongoDB: Mongoose adapter
 * - Cloudflare D1: Coming soon
 *
 * **Dependency Injection:**
 * Factory pattern enables clean dependency injection and testability.
 * All components created with proper dependencies wired up.
 *
 * @example
 * ```typescript
 * import { createAuthRouter } from '@togglebox/auth';
 *
 * const authRouter = createAuthRouter({
 *   dbType: 'mysql',
 *   authEnabled: true
 * });
 *
 * app.use('/api/v1', authRouter);
 * ```
 */

import { Router } from 'express';
import { createDynamoDBAuthRepositories, AuthRepositories } from './adapters/dynamodb';
import { UserService } from './services/UserService';
import { PasswordResetService } from './services/PasswordResetService';
import { ApiKeyService } from './services/ApiKeyService';
import { EmailService, createEmailService } from './services/EmailService';
import { AuthController } from './controllers/AuthController';
import { UserController } from './controllers/UserController';
import { PasswordResetController } from './controllers/PasswordResetController';
import { ApiKeyController } from './controllers/ApiKeyController';
import { createAuthMiddleware, AuthMiddleware } from './middleware/auth';
import { createAuthRoutes } from './routes/authRoutes';
import { createUserRoutes } from './routes/userRoutes';
import { createPasswordResetRoutes } from './routes/passwordResetRoutes';
import { createApiKeyRoutes } from './routes/apiKeyRoutes';
import { logger } from '@togglebox/shared';

/**
 * Supported database types for authentication storage.
 *
 * @remarks
 * **Database Adapters:**
 * - `dynamodb` - AWS DynamoDB (serverless, single-table design)
 * - `mysql` - MySQL via Prisma (5.7+, 8.0+)
 * - `postgresql` - PostgreSQL via Prisma (10+)
 * - `sqlite` - SQLite via Prisma (local development)
 * - `mongodb` - MongoDB via Mongoose (4.0+)
 * - `d1` - Cloudflare D1 (coming soon, SQLite at edge)
 */
export type DatabaseType = 'dynamodb' | 'mysql' | 'postgresql' | 'mongodb' | 'sqlite' | 'd1';

/**
 * Configuration options for authentication module.
 *
 * @remarks
 * **Environment Variable Defaults:**
 * - `dbType`: Defaults to `DB_TYPE` env var, fallback to 'dynamodb'
 * - `authEnabled`: Defaults to `ENABLE_AUTHENTICATION` env var, fallback to true
 * - `basePath`: Defaults to '/auth' (not yet implemented)
 *
 * **Email Service:**
 * If not provided, creates default SMTP service from environment variables:
 * - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
 * - `FROM_EMAIL`, `FROM_NAME`
 */
export interface AuthModuleConfig {
  /**
   * Database type (defaults to DB_TYPE environment variable or 'dynamodb')
   *
   * @defaultValue 'dynamodb'
   */
  dbType?: DatabaseType;

  /**
   * Custom email service (optional - will use default SMTP service if not provided)
   *
   * @remarks
   * Provide custom implementation for non-SMTP email providers (SendGrid, AWS SES, etc.)
   */
  emailService?: EmailService;

  /**
   * Enable/disable authentication (defaults to ENABLE_AUTHENTICATION env var)
   *
   * @remarks
   * When disabled:
   * - JWT validation skipped
   * - API key validation skipped
   * - All endpoints public (useful for development/testing)
   *
   * **WARNING:** Never disable in production!
   *
   * @defaultValue true
   */
  authEnabled?: boolean;

  /**
   * Base path for routes (defaults to '/auth')
   *
   * @remarks
   * **Not yet implemented** - all routes mounted at root of router.
   * Use `app.use('/custom-path', authRouter)` for custom base paths.
   *
   * @deprecated Not implemented
   */
  basePath?: string;
}

/**
 * Create auth repository collection for specified database type.
 *
 * @param dbType - Database type to use
 * @returns Object containing all auth repositories
 * @throws {Error} If database type unsupported or connection fails
 *
 * @remarks
 * **Automatic Adapter Selection:**
 * - `dynamodb`: Returns DynamoDB repositories (single-table design)
 * - `mysql`, `postgresql`, `sqlite`: Returns Prisma repositories
 * - `mongodb`: Returns Mongoose repositories (auto-connects)
 * - `d1`: Not yet implemented (coming soon)
 *
 * **Connection Handling:**
 * - DynamoDB: No connection needed (AWS SDK handles it)
 * - Prisma: Lazy connection on first query
 * - MongoDB: Connects immediately, logs error if fails
 *
 * **Repository Collection:**
 * ```typescript
 * {
 *   user: IUserRepository,
 *   apiKey: IApiKeyRepository,
 *   passwordReset: IPasswordResetRepository
 * }
 * ```
 *
 * @example
 * ```typescript
 * const repos = createAuthRepositories('mysql');
 * const userService = new UserService(repos.user);
 * ```
 */
export function createAuthRepositories(dbType: DatabaseType): AuthRepositories {
  switch (dbType) {
    case 'dynamodb':
      return createDynamoDBAuthRepositories();

    case 'mysql':
    case 'postgresql':
    case 'sqlite': {
      // Prisma adapter supports MySQL, PostgreSQL, and SQLite
      const { createPrismaAuthRepositories } = require('./adapters/prisma');
      return createPrismaAuthRepositories();
    }

    case 'mongodb': {
      // MongoDB adapter with Mongoose
      const { createMongoDBAuthRepositories, connectMongoDB } = require('./adapters/mongodb');
      // Auto-connect to MongoDB
      connectMongoDB().catch((err: Error) => {
        logger.error('Failed to connect to MongoDB', err);
      });
      return createMongoDBAuthRepositories();
    }

    case 'd1':
      // D1 is Cloudflare's SQLite-based database
      // Can use Prisma adapter with D1 connector
      throw new Error(
        `Database type 'd1' not yet implemented for auth module. ` +
        `D1 support coming soon - will use Prisma with D1 connector.`
      );

    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

/**
 * Create complete authentication router with all endpoints.
 *
 * @param config - Optional configuration
 * @returns Express Router with all auth endpoints mounted
 *
 * @remarks
 * **Factory Function:**
 * Creates and wires up all authentication components:
 * 1. Repositories (based on dbType)
 * 2. Services (UserService, ApiKeyService, PasswordResetService)
 * 3. Controllers (AuthController, UserController, etc.)
 * 4. Middleware (authentication, authorization)
 * 5. Routes (mounted at appropriate paths)
 *
 * **Mounted Routes:**
 * - `/auth` - Registration, login, token refresh
 * - `/users` - User profile and admin operations
 * - `/auth/password-reset` - 3-step password reset flow
 * - `/api-keys` - API key management
 *
 * **Usage:**
 * Mount the returned router in your Express app:
 * ```typescript
 * app.use('/api/v1', createAuthRouter({ dbType: 'mysql' }));
 * ```
 *
 * **Endpoints:**
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - GET /api/v1/users/me
 * - PATCH /api/v1/users/me
 * - POST /api/v1/users/me/password
 * - GET /api/v1/users (admin)
 * - GET /api/v1/users/:id (admin)
 * - DELETE /api/v1/users/:id (admin)
 * - POST /api/v1/auth/password-reset/request
 * - POST /api/v1/auth/password-reset/verify
 * - POST /api/v1/auth/password-reset/complete
 * - GET /api/v1/api-keys
 * - POST /api/v1/api-keys
 * - GET /api/v1/api-keys/:id
 * - DELETE /api/v1/api-keys/:id
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createAuthRouter } from '@togglebox/auth';
 *
 * const app = express();
 * app.use(express.json());
 *
 * const authRouter = createAuthRouter({
 *   dbType: 'postgresql',
 *   authEnabled: true
 * });
 *
 * app.use('/api/v1', authRouter);
 * app.listen(3000);
 * ```
 */
export function createAuthRouter(config: AuthModuleConfig = {}): Router {
  // Determine database type
  const dbType = (config.dbType || process.env['DB_TYPE'] || 'dynamodb') as DatabaseType;

  // Create repositories
  const repositories = createAuthRepositories(dbType);

  // Create email service
  const emailService = config.emailService || createEmailService();

  // Create services
  const userService = new UserService(repositories.user);
  const passwordResetService = new PasswordResetService(
    repositories.user,
    repositories.passwordReset,
    emailService
  );
  const apiKeyService = new ApiKeyService(repositories.apiKey, repositories.user);

  // Create auth middleware
  const authMiddleware = createAuthMiddleware({
    apiKeyService,
    userService,
    authEnabled: config.authEnabled,
  });

  // Create controllers
  const authController = new AuthController(userService);
  const userController = new UserController(userService);
  const passwordResetController = new PasswordResetController(passwordResetService);
  const apiKeyController = new ApiKeyController(apiKeyService);

  // Create routes
  const authRoutes = createAuthRoutes(authController, authMiddleware);
  const userRoutes = createUserRoutes(userController, authMiddleware);
  const passwordResetRoutes = createPasswordResetRoutes(passwordResetController);
  const apiKeyRoutes = createApiKeyRoutes(apiKeyController, authMiddleware);

  // Combine all routes
  const router = Router();

  // Mount routes
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/auth/password-reset', passwordResetRoutes);
  router.use('/api-keys', apiKeyRoutes);

  return router;
}

/**
 * Create standalone authentication middleware for protecting routes.
 *
 * @param config - Optional configuration
 * @returns Authentication middleware collection
 *
 * @remarks
 * **Use Case:**
 * Use this when you need authentication middleware without the full auth router.
 * Ideal for protecting routes in other parts of your application.
 *
 * **Middleware Collection:**
 * ```typescript
 * {
 *   authenticate: RequestHandler,           // JWT or API key
 *   authenticateJWT: RequestHandler,        // JWT only
 *   authenticateAPIKey: RequestHandler,     // API key only
 *   requirePermission: (perm: string) => RequestHandler,
 *   requireRole: (role: UserRole) => RequestHandler,
 *   conditionalAuth: RequestHandler
 * }
 * ```
 *
 * **Dependency Creation:**
 * Automatically creates required repositories and services based on dbType.
 *
 * @example
 * ```typescript
 * import { createAuthMiddlewareForApp } from '@togglebox/auth';
 *
 * const authMiddleware = createAuthMiddlewareForApp({
 *   dbType: 'mysql',
 *   authEnabled: true
 * });
 *
 * // Protect route with JWT
 * app.get('/api/protected',
 *   authMiddleware.authenticate,
 *   (req, res) => res.json({ message: 'Protected!' })
 * );
 *
 * // Require specific permission
 * app.delete('/api/admin/users/:id',
 *   authMiddleware.authenticate,
 *   authMiddleware.requirePermission('user:manage'),
 *   userController.deleteUser
 * );
 * ```
 */
export function createAuthMiddlewareForApp(config: AuthModuleConfig = {}): AuthMiddleware {
  const dbType = (config.dbType || process.env['DB_TYPE'] || 'dynamodb') as DatabaseType;
  const repositories = createAuthRepositories(dbType);

  const userService = new UserService(repositories.user);
  const apiKeyService = new ApiKeyService(repositories.apiKey, repositories.user);

  return createAuthMiddleware({
    apiKeyService,
    userService,
    authEnabled: config.authEnabled,
  });
}
