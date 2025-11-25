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

import { getDatabase, DatabaseRepositories, resetDatabase } from '@togglebox/database';
import { createCacheProvider, CacheProvider, CacheConfig } from '@togglebox/cache';
import { ConfigController } from './controllers/configController';
import { FeatureFlagController } from './controllers/featureFlagController';
import { WebhookController } from './controllers/webhookController';

/**
 * Application Dependencies Container
 *
 * @remarks
 * Uses singleton pattern for production performance.
 * For testing, use Container.reset() or Container.setDependencies() to inject mocks.
 */
export class Container {
  private static db: DatabaseRepositories | null = null;
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
   */
  static getCacheProvider(): CacheProvider {
    if (!this.cacheProvider) {
      const config: CacheConfig = {
        enabled: process.env['CACHE_ENABLED'] === 'true',
        provider: (process.env['CACHE_PROVIDER'] as 'cloudfront' | 'cloudflare' | 'none') || 'cloudfront',
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
   * Create ConfigController with injected dependencies
   */
  static createConfigController(): ConfigController {
    return new ConfigController(
      this.getDatabase(),
      this.getCacheProvider()
    );
  }

  /**
   * Create FeatureFlagController with injected dependencies
   */
  static createFeatureFlagController(): FeatureFlagController {
    return new FeatureFlagController(
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
    cacheProvider?: CacheProvider;
  }): void {
    if (dependencies.db) {
      this.db = dependencies.db;
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
    this.cacheProvider = null;
    // Reset database package-level singleton
    resetDatabase();
  }
}
