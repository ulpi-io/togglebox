/**
 * Example Test File
 *
 * Demonstrates how to test controllers with dependency injection.
 * This file serves as documentation and can be used as a template.
 *
 * @remarks
 * To run tests:
 * ```bash
 * pnpm test
 * # or
 * pnpm --filter api test
 * ```
 */

import { Container } from '../container';
import {
  setupTestContainer,
  createMockRequest,
  createMockResponse,
  createMockNext,
} from './testUtils';

describe('Example: Controller Testing with Dependency Injection', () => {
  let mockDb: ReturnType<typeof setupTestContainer>['mockDb'];
  let mockCache: ReturnType<typeof setupTestContainer>['mockCache'];

  /**
   * Setup: Inject mock dependencies before each test
   */
  beforeEach(() => {
    ({ mockDb, mockCache } = setupTestContainer());
  });

  /**
   * Cleanup: Reset singleton instances after each test
   */
  afterEach(() => {
    Container.reset();
  });

  describe('ConfigController', () => {
    it('should create a controller with injected dependencies', () => {
      const controller = Container.createConfigController();
      expect(controller).toBeDefined();
    });

    it('example: should list platforms', async () => {
      // Arrange
      const mockPlatforms = [
        { name: 'web', description: 'Web platform', createdAt: new Date().toISOString() },
        { name: 'mobile', description: 'Mobile platform', createdAt: new Date().toISOString() },
      ];

      mockDb.platform.listPlatforms.mockResolvedValue(mockPlatforms);

      const controller = Container.createConfigController();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await controller.listPlatforms(req as any, res as any, next);

      // Assert
      expect(mockDb.platform.listPlatforms).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlatforms,
        timestamp: expect.any(String),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('example: should handle errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockDb.platform.listPlatforms.mockRejectedValue(error);

      const controller = Container.createConfigController();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await controller.listPlatforms(req as any, res as any, next);

      // Assert
      expect(mockDb.platform.listPlatforms).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('FeatureFlagController', () => {
    it('should create a controller with injected dependencies', () => {
      const controller = Container.createFeatureFlagController();
      expect(controller).toBeDefined();
    });

    it('example: should create a feature flag', async () => {
      // Arrange
      const mockFlag = {
        platform: 'web',
        environment: 'production',
        flagName: 'new-feature',
        enabled: true,
        description: 'Test feature',
        createdBy: 'test-user',
        createdAt: new Date().toISOString(),
        rolloutType: 'simple' as const,
      };

      mockDb.featureFlag.createFeatureFlag.mockResolvedValue(mockFlag);
      mockCache.invalidateCache.mockResolvedValue('invalidation-123');

      const controller = Container.createFeatureFlagController();
      const req = createMockRequest({
        body: {
          platform: 'web',
          environment: 'production',
          flagName: 'new-feature',
          enabled: true,
          description: 'Test feature',
          createdBy: 'test-user',
          rolloutType: 'simple',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await controller.createFeatureFlag(req as any, res as any, next);

      // Assert
      expect(mockDb.featureFlag.createFeatureFlag).toHaveBeenCalled();
      expect(mockCache.invalidateCache).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Container Singleton Behavior', () => {
    it('should return the same database instance', () => {
      const db1 = Container.getDatabase();
      const db2 = Container.getDatabase();
      expect(db1).toBe(db2);
    });

    it('should return the same cache provider instance', () => {
      const cache1 = Container.getCacheProvider();
      const cache2 = Container.getCacheProvider();
      expect(cache1).toBe(cache2);
    });

    it('should reset instances correctly', () => {
      const db1 = Container.getDatabase();
      Container.reset();

      // After reset, should create new instances
      setupTestContainer();
      const db2 = Container.getDatabase();

      expect(db1).not.toBe(db2);
    });
  });
});
