/**
 * Zod validation schemas and middleware for authentication.
 *
 * @module validators
 *
 * @remarks
 * Provides runtime validation with compile-time types using Zod.
 * All authentication endpoints should use these schemas via {@link validate} middleware.
 */
export * from './authSchemas';
