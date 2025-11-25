/**
 * @togglebox/auth - Authentication module for Togglebox
 *
 * @packageDocumentation
 *
 * @remarks
 * Comprehensive authentication system providing:
 * - User registration and login (JWT-based)
 * - Password reset flow (3-step, secure)
 * - API key management (for service-to-service auth)
 * - Role-based access control (RBAC)
 * - Multi-database support (DynamoDB, MySQL, PostgreSQL, MongoDB, SQLite)
 *
 * **Quick Start:**
 * ```typescript
 * import express from 'express';
 * import { createAuthRouter } from '@togglebox/auth';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // Create and mount auth router
 * const authRouter = createAuthRouter({
 *   dbType: 'mysql',
 *   authEnabled: true
 * });
 *
 * app.use('/api/v1', authRouter);
 * app.listen(3000);
 * ```
 *
 * **Key Features:**
 * - **JWT Authentication:** Stateless authentication with signed tokens
 * - **API Key Support:** Long-lived keys for service authentication
 * - **Password Security:** Bcrypt hashing (10 salt rounds)
 * - **RBAC:** Role-based permissions (admin, developer, viewer)
 * - **User Enumeration Prevention:** Generic error messages
 * - **Token Expiration:** 1-hour reset tokens, configurable JWT expiry
 *
 * **Database Support:**
 * - DynamoDB (AWS Lambda)
 * - MySQL/PostgreSQL/SQLite (Prisma)
 * - MongoDB (Mongoose)
 * - Cloudflare D1 (coming soon)
 *
 * **Architecture:**
 * - Repository pattern for data access
 * - Service layer for business logic
 * - Controller layer for HTTP handling
 * - Factory pattern for dependency injection
 *
 * **Security:**
 * - Passwords hashed with bcrypt (never stored plaintext)
 * - API keys hashed (full key shown only at creation)
 * - JWT tokens signed with secret key
 * - Reset tokens single-use and time-limited
 *
 * @see {@link createAuthRouter} - Main entry point
 * @see {@link createAuthMiddlewareForApp} - Standalone middleware
 * @see {@link https://github.com/togglebox/togglebox/tree/main/packages/auth Documentation}
 */

// Main exports
export { createAuthRouter, createAuthMiddlewareForApp, createAuthRepositories } from './factory';
export type { AuthModuleConfig, DatabaseType } from './factory';

// Models
export * from './models/User';
export * from './models/ApiKey';
export * from './models/PasswordResetToken';

// Interfaces
export * from './interfaces';

// Services (export only the classes, not overlapping types)
export { UserService } from './services/UserService';
export { PasswordResetService } from './services/PasswordResetService';
export { ApiKeyService } from './services/ApiKeyService';
export { EmailService, createEmailService } from './services/EmailService';
export type { EmailServiceConfig } from './services/EmailService';

// Middleware
export * from './middleware/auth';

// Utils (export individual exports to avoid conflicts)
export {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  verifyToken as verifyTokenHash,
  generateApiKey,
  getApiKeyPrefix,
  getApiKeyLast4,
  generateToken,
  decodeToken,
} from './utils';
export { verifyToken as verifyJWT } from './utils/jwt';
export type { JwtPayload } from './utils/jwt';

// Validators
export { validate } from './validators';
export type {
  RegisterData,
  LoginData,
  ChangePasswordData,
  UpdateProfileData,
  PasswordResetRequestData,
  PasswordResetVerifyData,
  PasswordResetCompleteData,
} from './validators/authSchemas';
export {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  passwordResetCompleteSchema,
  createApiKeySchema,
} from './validators/authSchemas';

// Controllers (export only the classes)
export { AuthController } from './controllers/AuthController';
export { UserController } from './controllers/UserController';
export { PasswordResetController } from './controllers/PasswordResetController';
export { ApiKeyController } from './controllers/ApiKeyController';

// Adapters
export * from './adapters/dynamodb';
