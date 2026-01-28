/**
 * Cloudflare D1 adapter module for database operations.
 *
 * @module d1
 *
 * @remarks
 * Provides D1 repository implementations using Cloudflare's edge SQLite database.
 * Optimized for global deployment on Cloudflare Workers.
 *
 * **Architecture:**
 * - Full SQL implementations using D1 API
 * - No connection pooling (serverless, edge runtime)
 * - Offset-based pagination (SQL LIMIT/OFFSET)
 * - JSON string serialization for complex fields
 * - SQLite-style parameterized queries (?1, ?2, etc.)
 *
 * **Key Features:**
 * - Edge-optimized SQLite at Cloudflare's network edge
 * - Global distribution with automatic replication
 * - Zero cold starts (no connection management)
 * - Standard SQLite syntax and constraints
 *
 * @example
 * ```ts
 * // In Cloudflare Worker:
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const db = createD1Repositories({ type: 'd1', database: env.DB });
 *     const platform = await db.platform.createPlatform({ name: 'web', description: '...' });
 *   }
 * }
 * ```
 */

import { D1PlatformRepository } from "./D1PlatformRepository";
import { D1EnvironmentRepository } from "./D1EnvironmentRepository";
import { D1ConfigRepository } from "./D1ConfigRepository";
import { D1UsageRepository } from "./D1UsageRepository";
import { D1FlagRepository } from "./D1FlagRepository";
import { D1ExperimentRepository } from "./D1ExperimentRepository";
import { D1StatsRepository } from "./D1StatsRepository";
import {
  IPlatformRepository,
  IEnvironmentRepository,
  IConfigRepository,
  IUsageRepository,
} from "../../interfaces";
import type { IFlagRepository } from "@togglebox/flags";
import type { IExperimentRepository } from "@togglebox/experiments";
import type { IStatsRepository } from "@togglebox/stats";

export interface DatabaseRepositories {
  platform: IPlatformRepository;
  environment: IEnvironmentRepository;
  config: IConfigRepository;
  usage: IUsageRepository;
}

/**
 * Container for three-tier architecture repositories (D1 implementation).
 */
export interface ThreeTierRepositories {
  flag: IFlagRepository;
  experiment: IExperimentRepository;
  stats: IStatsRepository;
}

/**
 * Configuration for Cloudflare D1 database
 */
export interface D1DatabaseConfig {
  type: "d1";
  database: D1Database; // D1 database binding from Cloudflare Workers environment
}

/**
 * Creates repository instances for Cloudflare D1 database
 *
 * @param config - D1 database configuration
 * @returns Repository instances for all entities
 *
 * @example
 * ```typescript
 * // In Cloudflare Worker:
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const db = createD1Repositories({ type: 'd1', database: env.DB });
 *     // Use db.platform, db.environment, etc.
 *   }
 * }
 * ```
 */
export function createD1Repositories(
  config: D1DatabaseConfig,
): DatabaseRepositories {
  const { database } = config;

  return {
    platform: new D1PlatformRepository(database),
    environment: new D1EnvironmentRepository(database),
    config: new D1ConfigRepository(database),
    usage: new D1UsageRepository(database),
  };
}

/**
 * Creates three-tier repository instances for Cloudflare D1 database.
 *
 * @param database - D1 database binding from Cloudflare Workers environment
 * @returns Three-tier repositories for flags, experiments, and stats
 *
 * @remarks
 * Use this function to create repositories for the new three-tier architecture:
 * - Tier 2: Feature Flags (2-value model with targeting)
 * - Tier 3: Experiments (multi-variant A/B testing)
 * - Stats: Statistics for all tiers
 *
 * @example
 * ```typescript
 * // In Cloudflare Worker:
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const threeTier = createD1ThreeTierRepositories(env.DB);
 *
 *     // Create a feature flag
 *     const flag = await threeTier.flag.create({...});
 *
 *     // Create an experiment
 *     const exp = await threeTier.experiment.create({...});
 *
 *     // Track stats
 *     await threeTier.stats.incrementFlagEvaluation(...);
 *   }
 * }
 * ```
 */
export function createD1ThreeTierRepositories(
  database: D1Database,
): ThreeTierRepositories {
  return {
    flag: new D1FlagRepository(database),
    experiment: new D1ExperimentRepository(database),
    stats: new D1StatsRepository(database),
  };
}

// Export all repository classes
export {
  D1PlatformRepository,
  D1EnvironmentRepository,
  D1ConfigRepository,
  D1UsageRepository,
  D1FlagRepository,
  D1ExperimentRepository,
  D1StatsRepository,
};

// D1 types are now available globally from @cloudflare/workers-types
