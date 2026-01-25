/**
 * Dependency Injection Container
 *
 * Centralized factory for creating application dependencies.
 * Provides a single source of truth for:
 * - Database connections
 * - Cache providers
 * - Controllers
 *
 * This pattern enables:
 * - Easier testing (inject mocks)
 * - Centralized configuration
 * - Explicit dependency graph
 */

import { getDatabase, DatabaseRepositories, resetDatabase, getThreeTierRepositories, ThreeTierRepositories, resetThreeTierRepositories } from '@togglebox/database';
import { createCacheProvider, CacheProvider, CacheConfig } from '@togglebox/cache';
import { logger } from '@togglebox/shared';
import { ConfigController } from './controllers/configController';
import { WebhookController } from './controllers/webhookController';
import { FlagController } from './controllers/flagController';
import { ExperimentController } from './controllers/experimentController';
import { StatsController } from './controllers/statsController';

/**
 * Application Dependencies Container
 *
 * @remarks
 * Uses singleton pattern for production performance.
 * For testing, use Container.reset() or Container.setDependencies() to inject mocks.
 */
export class Container {
  private static db: DatabaseRepositories | null = null;
  private static threeTierRepos: ThreeTierRepositories | null = null;
  private static cacheProvider: CacheProvider | null = null;

  /**
   * Get or create database connection
   * Singleton pattern to reuse connection across controllers
   *
   * @remarks
   * For testing, use Container.setDependencies() to inject mock database
   */
  static getDatabase(): DatabaseRepositories {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  /**
   * Get or create cache provider
   * Singleton pattern to reuse provider across controllers
   *
   * @remarks
   * For testing, use Container.setDependencies() to inject mock cache provider
   *
   * Validates provider configuration and defaults to 'none' if required credentials are missing:
   * - CloudFront requires distributionId
   * - Cloudflare requires zoneId and apiToken
   */
  static getCacheProvider(): CacheProvider {
    if (!this.cacheProvider) {
      const envProvider = (process.env['CACHE_PROVIDER'] as 'cloudfront' | 'cloudflare' | 'none') || 'cloudfront';
      let provider = envProvider;

      // Validate CloudFront configuration
      if (envProvider === 'cloudfront' && !process.env['CLOUDFRONT_DISTRIBUTION_ID']) {
        logger.warn('Cache provider set to "cloudfront" but CLOUDFRONT_DISTRIBUTION_ID is missing. Defaulting to disabled cache.');
        provider = 'none';
      }

      // Validate Cloudflare configuration
      if (envProvider === 'cloudflare' && (!process.env['CLOUDFLARE_ZONE_ID'] || !process.env['CLOUDFLARE_API_TOKEN'])) {
        logger.warn('Cache provider set to "cloudflare" but CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN is missing. Defaulting to disabled cache.');
        provider = 'none';
      }

      const config: CacheConfig = {
        enabled: process.env['CACHE_ENABLED'] === 'true',
        provider,
        cloudfront: {
          distributionId: process.env['CLOUDFRONT_DISTRIBUTION_ID'],
          region: process.env['AWS_REGION'] || 'us-east-1',
        },
        cloudflare: {
          zoneId: process.env['CLOUDFLARE_ZONE_ID'],
          apiToken: process.env['CLOUDFLARE_API_TOKEN'],
        },
      };
      this.cacheProvider = createCacheProvider(config);
    }
    return this.cacheProvider;
  }

  /**
   * Get or create three-tier repositories (flags, experiments, stats)
   * Singleton pattern to reuse repositories across controllers
   */
  static getThreeTierRepositories(): ThreeTierRepositories {
    if (!this.threeTierRepos) {
      this.threeTierRepos = getThreeTierRepositories();
    }
    return this.threeTierRepos;
  }

  /**
   * Create ConfigController with injected dependencies
   */
  static createConfigController(): ConfigController {
    return new ConfigController(
      this.getDatabase(),
      this.getCacheProvider()
    );
  }

  /**
   * Create WebhookController with injected dependencies
   */
  static createWebhookController(): WebhookController {
    return new WebhookController(
      this.getCacheProvider()
    );
  }

  /**
   * Create FlagController with injected dependencies (Tier 2: 2-value flags)
   */
  static createFlagController(): FlagController {
    return new FlagController(
      this.getThreeTierRepositories(),
      this.getCacheProvider()
    );
  }

  /**
   * Create ExperimentController with injected dependencies
   */
  static createExperimentController(): ExperimentController {
    return new ExperimentController(
      this.getThreeTierRepositories(),
      this.getCacheProvider()
    );
  }

  /**
   * Create StatsController with injected dependencies
   */
  static createStatsController(): StatsController {
    return new StatsController(
      this.getThreeTierRepositories()
    );
  }

  /**
   * Set dependencies for testing (dependency injection)
   *
   * @param dependencies - Mock dependencies to inject
   *
   * @example
   * ```typescript
   * // In test file
   * import { Container } from './container';
   *
   * beforeEach(() => {
   *   Container.setDependencies({
   *     db: mockDatabase,
   *     cacheProvider: mockCacheProvider,
   *   });
   * });
   *
   * afterEach(() => {
   *   Container.reset();
   * });
   * ```
   */
  static setDependencies(dependencies: {
    db?: DatabaseRepositories;
    threeTierRepos?: ThreeTierRepositories;
    cacheProvider?: CacheProvider;
  }): void {
    if (dependencies.db) {
      this.db = dependencies.db;
    }
    if (dependencies.threeTierRepos) {
      this.threeTierRepos = dependencies.threeTierRepos;
    }
    if (dependencies.cacheProvider) {
      this.cacheProvider = dependencies.cacheProvider;
    }
  }

  /**
   * Reset singleton instances (useful for testing)
   *
   * @remarks
   * Clears both Container-level and database package-level singletons.
   * Call this in afterEach() or afterAll() hooks in tests.
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   Container.reset();
   * });
   * ```
   */
  static reset(): void {
    this.db = null;
    this.threeTierRepos = null;
    this.cacheProvider = null;
    // Reset database package-level singletons
    resetDatabase();
    resetThreeTierRepositories();
  }
}
