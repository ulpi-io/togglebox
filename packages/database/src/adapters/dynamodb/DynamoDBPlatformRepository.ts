/**
 * DynamoDB adapter for platform operations.
 *
 * @remarks
 * Thin wrapper implementing `IPlatformRepository` by delegating to `platformService`.
 * Uses DynamoDB single-table design with token-based pagination.
 */

import { Platform } from "@togglebox/core";
import {
  IPlatformRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  TokenPaginatedResult,
} from "../../interfaces";
import * as platformService from "../../platformService";

/**
 * DynamoDB implementation of platform repository.
 *
 * @remarks
 * Delegates all operations to `platformService` which handles DynamoDB-specific logic.
 * Implements token-based pagination (DynamoDB native).
 */
export class DynamoDBPlatformRepository implements IPlatformRepository {
  async createPlatform(platform: Omit<Platform, "id">): Promise<Platform> {
    return platformService.createPlatform(platform);
  }

  async getPlatform(name: string): Promise<Platform | null> {
    return platformService.getPlatform(name);
  }

  async listPlatforms(
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<TokenPaginatedResult<Platform>> {
    // DynamoDB uses token-based pagination
    // If pagination is undefined, platformService will fetch ALL items
    const params = pagination as TokenPaginationParams | undefined;
    return platformService.listPlatforms(params);
  }

  async deletePlatform(name: string): Promise<boolean> {
    return platformService.deletePlatform(name);
  }

  async updatePlatform(
    currentName: string,
    updates: { name?: string; description?: string },
  ): Promise<Platform | null> {
    return platformService.updatePlatform(currentName, updates);
  }
}
