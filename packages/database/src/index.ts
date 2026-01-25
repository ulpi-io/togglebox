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
 * - `getThreeTierRepositories()` - Get three-tier architecture repositories
 * - Services: `platformService`, `environmentService`, `configService`
 * - Interfaces: `IPlatformRepository`, `IEnvironmentRepository`, etc.
 * - Factory: `createDatabaseRepositories()`, `DatabaseRepositories`, `ThreeTierRepositories`
 *
 * **Three-Tier Architecture:**
 * - Tier 1: Remote Configs (uses existing config repository)
 * - Tier 2: Feature Flags (new 2-value model via @togglebox/flags)
 * - Tier 3: Experiments (multi-variant via @togglebox/experiments)
 * - Stats: Metrics for all tiers via @togglebox/stats
 */

export * from './database';
export * from './platformService';
export * from './environmentService';
export * from './configService';
export * from './interfaces';
export * from './config';
export * from './factory';

// Re-export three-tier repository types for convenience
export type { IFlagRepository } from '@togglebox/flags';
export type { IExperimentRepository } from '@togglebox/experiments';
export type { IStatsRepository } from '@togglebox/stats';
