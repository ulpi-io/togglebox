/**
 * Database repository interfaces and pagination types.
 *
 * @module interfaces
 *
 * @remarks
 * Exports all repository interfaces and pagination types for database adapters.
 * These interfaces define the contract that all database adapters must implement.
 */

export * from './IPlatformRepository';
export * from './IEnvironmentRepository';
export * from './IConfigRepository';
export * from './IFeatureFlagRepository';
export * from './IUsageRepository';
export * from './IPagination';
