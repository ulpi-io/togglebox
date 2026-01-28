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

import { Container } from "../container";
import {
  setupTestContainer,
  createMockRequest,
  createMockResponse,
  createMockNext,
} from "./testUtils";

describe("Example: Controller Testing with Dependency Injection", () => {
  let mockDb: ReturnType<typeof setupTestContainer>["mockDb"];
  let mockThreeTier: ReturnType<typeof setupTestContainer>["mockThreeTier"];
  let mockCache: ReturnType<typeof setupTestContainer>["mockCache"];

  /**
   * Setup: Inject mock dependencies before each test
   */
  beforeEach(() => {
    ({ mockDb, mockThreeTier, mockCache } = setupTestContainer());
  });

  /**
   * Cleanup: Reset singleton instances after each test
   */
  afterEach(() => {
    Container.reset();
  });

  describe("ConfigController", () => {
    it("should create a controller with injected dependencies", () => {
      const controller = Container.createConfigController();
      expect(controller).toBeDefined();
    });

    it("example: should list platforms", async () => {
      // Arrange
      const mockPlatforms = [
        {
          name: "web",
          description: "Web platform",
          createdAt: new Date().toISOString(),
        },
        {
          name: "mobile",
          description: "Mobile platform",
          createdAt: new Date().toISOString(),
        },
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

    it("example: should handle errors", async () => {
      // Arrange
      const error = new Error("Database connection failed");
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

  describe("FlagController", () => {
    it("should create a controller with injected dependencies", () => {
      const controller = Container.createFlagController();
      expect(controller).toBeDefined();
    });

    it("example: should create a flag", async () => {
      // Arrange
      const mockFlag = {
        platform: "web",
        environment: "production",
        flagKey: "new-feature",
        name: "New Feature",
        description: "Test feature",
        flagType: "boolean" as const,
        enabled: true,
        valueA: true,
        valueB: false,
        version: "1.0.0",
        isActive: true,
        createdBy: "test-user@example.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockThreeTier.flag.create.mockResolvedValue(mockFlag);
      mockCache.invalidateFlagCache.mockResolvedValue("invalidation-123");

      const controller = Container.createFlagController();
      const req = createMockRequest({
        params: { platform: "web", environment: "production" },
        body: {
          flagKey: "new-feature",
          name: "New Feature",
          description: "Test feature",
          flagType: "boolean",
          valueA: true,
          valueB: false,
          createdBy: "test-user@example.com",
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await controller.createFlag(req as any, res as any, next);

      // Assert
      expect(mockThreeTier.flag.create).toHaveBeenCalled();
      expect(mockCache.invalidateFlagCache).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("Container Singleton Behavior", () => {
    it("should return the same database instance", () => {
      const db1 = Container.getDatabase();
      const db2 = Container.getDatabase();
      expect(db1).toBe(db2);
    });

    it("should return the same cache provider instance", () => {
      const cache1 = Container.getCacheProvider();
      const cache2 = Container.getCacheProvider();
      expect(cache1).toBe(cache2);
    });

    it("should reset instances correctly", () => {
      const db1 = Container.getDatabase();
      Container.reset();

      // After reset, should create new instances
      setupTestContainer();
      const db2 = Container.getDatabase();

      expect(db1).not.toBe(db2);
    });
  });
});
