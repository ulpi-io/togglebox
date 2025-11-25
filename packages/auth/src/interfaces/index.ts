/**
 * Repository interfaces for authentication system.
 *
 * @module interfaces
 *
 * @remarks
 * Defines the contracts that all database adapters (Prisma, DynamoDB, MongoDB)
 * must implement for authentication operations:
 * - User management (CRUD, email lookup, role-based access)
 * - API key management (creation, hashing, authentication)
 * - Password reset tokens (generation, expiration, cleanup)
 */
export * from './IUserRepository';
export * from './IApiKeyRepository';
export * from './IPasswordResetRepository';
