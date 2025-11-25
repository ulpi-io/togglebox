/**
 * Main entry point for the database package.
 *
 * @module database
 *
 * @remarks
 * Exports all database services, interfaces, and factory functions for multi-database support.
 *
 * **Key Exports:**
 * - `getDatabase()` - Get database repository singleton
 * - Services: `platformService`, `environmentService`, `configService`, `featureFlagService`
 * - Interfaces: `IPlatformRepository`, `IEnvironmentRepository`, etc.
 * - Factory: `createDatabaseRepositories()`, `DatabaseRepositories`
 */

export * from './database';
export * from './platformService';
export * from './environmentService';
export * from './configService';
export * from './featureFlagService';
export * from './interfaces';
export * from './config';
export * from './factory';
