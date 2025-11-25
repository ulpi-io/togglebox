/**
 * DynamoDB adapter for environment operations.
 *
 * @remarks
 * Thin wrapper implementing `IEnvironmentRepository` by delegating to `environmentService`.
 * Uses DynamoDB hierarchical storage pattern (environments under platforms).
 */

import { Environment } from '@togglebox/core';
import {
  IEnvironmentRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  TokenPaginatedResult,
} from '../../interfaces';
import * as environmentService from '../../environmentService';

/**
 * DynamoDB implementation of environment repository.
 *
 * @remarks
 * Delegates all operations to `environmentService` which handles DynamoDB-specific logic.
 * Implements token-based pagination (DynamoDB native).
 */
export class DynamoDBEnvironmentRepository implements IEnvironmentRepository {
  async createEnvironment(environment: Omit<Environment, 'createdAt'>): Promise<Environment> {
    return environmentService.createEnvironment(environment);
  }

  async getEnvironment(platform: string, environment: string): Promise<Environment | null> {
    return environmentService.getEnvironment(platform, environment);
  }

  async listEnvironments(
    platform: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<TokenPaginatedResult<Environment>> {
    // DynamoDB uses token-based pagination
    // If pagination is undefined, environmentService will fetch ALL items
    const params = pagination as TokenPaginationParams | undefined;
    return environmentService.listEnvironments(platform, params);
  }

  async deleteEnvironment(platform: string, environment: string): Promise<boolean> {
    return environmentService.deleteEnvironment(platform, environment);
  }
}
