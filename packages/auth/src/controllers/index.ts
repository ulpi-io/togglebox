/**
 * Express controllers for authentication system.
 *
 * @module controllers
 *
 * @remarks
 * HTTP request handlers organized by domain:
 * - {@link AuthController} - Registration, login, token refresh
 * - {@link UserController} - Profile management, user administration
 * - {@link ApiKeyController} - API key lifecycle management
 * - {@link PasswordResetController} - 3-step password reset flow
 *
 * **Controller Pattern:**
 * Controllers are classes with arrow function methods for Express handlers.
 * This preserves `this` binding for dependency injection.
 *
 * **Error Handling:**
 * - Service errors caught and mapped to HTTP status codes
 * - Unknown errors forwarded to Express error handling middleware
 * - Consistent JSON response format across all controllers
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
export * from './AuthController';
export * from './UserController';
export * from './PasswordResetController';
export * from './ApiKeyController';
