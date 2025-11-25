/**
 * DynamoDB adapter for configuration version operations.
 *
 * @remarks
 * Thin wrapper implementing `IConfigRepository` by delegating to `configService`.
 * Uses DynamoDB sparse index pattern for efficient stable version queries.
 */

import { Version } from '@togglebox/core';
import {
  IConfigRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  TokenPaginatedResult,
} from '../../interfaces';
import * as configService from '../../configService';

/**
 * DynamoDB implementation of configuration repository.
 *
 * @remarks
 * Delegates all operations to `configService` which handles DynamoDB-specific logic.
 * Implements token-based pagination and sparse index for stable versions.
 */
export class DynamoDBConfigRepository implements IConfigRepository {
  async createVersion(version: Omit<Version, 'versionTimestamp' | 'createdAt'>): Promise<Version> {
    return configService.createVersion(version);
  }

  async getVersion(
    platform: string,
    environment: string,
    versionTimestamp: string
  ): Promise<Version | null> {
    return configService.getVersion(platform, environment, versionTimestamp);
  }

  async getLatestStableVersion(platform: string, environment: string): Promise<Version | null> {
    return configService.getLatestStableVersion(platform, environment);
  }

  async listVersions(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<TokenPaginatedResult<Version>> {
    // DynamoDB uses token-based pagination
    // If pagination is undefined, configService will fetch ALL items
    const params = pagination as TokenPaginationParams | undefined;
    return configService.listVersions(platform, environment, params);
  }

  async deleteVersion(
    platform: string,
    environment: string,
    versionTimestamp: string
  ): Promise<boolean> {
    return configService.deleteVersion(platform, environment, versionTimestamp);
  }
}
