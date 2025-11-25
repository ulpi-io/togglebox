/**
 * Test Utilities for Dependency Injection Container
 *
 * Provides mock implementations and helper functions for testing controllers
 * with injected dependencies.
 *
 * @example
 * ```typescript
 * import { setupTestContainer, createMockDatabase, createMockCacheProvider } from './testUtils';
 * import { Container } from '../container';
 * import { ConfigController } from '../controllers/configController';
 *
 * describe('ConfigController', () => {
 *   let mockDb: ReturnType<typeof createMockDatabase>;
 *   let mockCache: ReturnType<typeof createMockCacheProvider>;
 *
 *   beforeEach(() => {
 *     ({ mockDb, mockCache } = setupTestContainer());
 *   });
 *
 *   afterEach(() => {
 *     Container.reset();
 *   });
 *
 *   it('should create a configuration', async () => {
 *     mockDb.config.createVersion.mockResolvedValue({ ... });
 *
 *     const controller = Container.createConfigController();
 *     // Test controller...
 *   });
 * });
 * ```
 */

import { DatabaseRepositories } from '@togglebox/database';
import { CacheProvider } from '@togglebox/cache';
import { Container } from '../container';

/**
 * Creates a mock database with jest mock functions for all repository methods
 *
 * @returns Mock database repositories
 */
export function createMockDatabase(): jest.Mocked<DatabaseRepositories> {
  return {
    platform: {
      createPlatform: jest.fn(),
      getPlatform: jest.fn(),
      listPlatforms: jest.fn(),
      updatePlatform: jest.fn(),
      deletePlatform: jest.fn(),
    },
    environment: {
      createEnvironment: jest.fn(),
      getEnvironment: jest.fn(),
      listEnvironments: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    },
    config: {
      createVersion: jest.fn(),
      getVersion: jest.fn(),
      getLatestStableVersion: jest.fn(),
      listVersions: jest.fn(),
      updateVersion: jest.fn(),
      deleteVersion: jest.fn(),
    },
    featureFlag: {
      createFeatureFlag: jest.fn(),
      getFeatureFlag: jest.fn(),
      listFeatureFlags: jest.fn(),
      updateFeatureFlag: jest.fn(),
      deleteFeatureFlag: jest.fn(),
    },
  } as jest.Mocked<DatabaseRepositories>;
}

/**
 * Creates a mock cache provider with jest mock functions
 *
 * @returns Mock cache provider
 */
export function createMockCacheProvider(): jest.Mocked<CacheProvider> {
  return {
    invalidateCache: jest.fn().mockResolvedValue('mock-invalidation-id'),
    invalidateGlobalCache: jest.fn().mockResolvedValue('mock-invalidation-id'),
    invalidatePlatformCache: jest.fn().mockResolvedValue('mock-invalidation-id'),
    invalidateEnvironmentCache: jest.fn().mockResolvedValue('mock-invalidation-id'),
    invalidateVersionCache: jest.fn().mockResolvedValue('mock-invalidation-id'),
    invalidateFeatureFlagCache: jest.fn().mockResolvedValue('mock-invalidation-id'),
    generateCachePaths: jest.fn().mockReturnValue(['/api/mock/path']),
    isEnabled: jest.fn().mockReturnValue(true),
  } as jest.Mocked<CacheProvider>;
}

/**
 * Sets up the test container with mock dependencies
 *
 * @returns Object containing mock database and cache provider
 *
 * @remarks
 * Call this in beforeEach() to reset and inject mocks.
 * Call Container.reset() in afterEach() to clean up.
 */
export function setupTestContainer() {
  const mockDb = createMockDatabase();
  const mockCache = createMockCacheProvider();

  Container.setDependencies({
    db: mockDb,
    cacheProvider: mockCache,
  });

  return { mockDb, mockCache };
}

/**
 * Helper to create a test request object
 *
 * @param overrides - Properties to override in the request
 * @returns Partial Express Request object for testing
 */
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: { 'x-request-id': 'test-request-id' },
    ...overrides,
  };
}

/**
 * Helper to create a test response object
 *
 * @returns Mock Express Response object with jest functions
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Helper to create a test next function
 *
 * @returns Mock Express NextFunction
 */
export function createMockNext() {
  return jest.fn();
}
