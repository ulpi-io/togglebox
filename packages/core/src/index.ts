/**
 * @togglebox/core
 *
 * Core business logic for remote config service.
 * Contains Zod schemas and feature flag evaluation logic.
 * Zero backend dependencies - can be used in frontend SDKs.
 */

// Export all schemas and types
export * from './schemas';

// Export feature flag evaluator
export * from './evaluator';
