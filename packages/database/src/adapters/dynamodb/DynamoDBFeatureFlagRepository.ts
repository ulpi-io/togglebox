/**
 * DynamoDB adapter for feature flag operations.
 *
 * @remarks
 * Thin wrapper implementing `IFeatureFlagRepository` by delegating to `featureFlagService`.
 * Supports phased rollouts (simple, percentage, targeted) with DynamoDB storage.
 */

import { FeatureFlag } from '@togglebox/core';
import {
  IFeatureFlagRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  TokenPaginatedResult,
} from '../../interfaces';
import * as featureFlagService from '../../featureFlagService';

/**
 * DynamoDB implementation of feature flag repository.
 *
 * @remarks
 * Delegates all operations to `featureFlagService` which handles DynamoDB-specific logic.
 * Implements dual-mode pagination (with/without token) for admin UI and SDK evaluation.
 */
export class DynamoDBFeatureFlagRepository implements IFeatureFlagRepository {
  async createFeatureFlag(
    featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    return featureFlagService.createFeatureFlag(featureFlag);
  }

  async getFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<FeatureFlag | null> {
    return featureFlagService.getFeatureFlag(platform, environment, flagName);
  }

  async listFeatureFlags(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<TokenPaginatedResult<FeatureFlag>> {
    // DynamoDB uses token-based pagination
    // If pagination is undefined, featureFlagService will fetch ALL items
    const params = pagination as TokenPaginationParams | undefined;
    return featureFlagService.listFeatureFlags(platform, environment, params);
  }

  async updateFeatureFlag(
    platform: string,
    environment: string,
    flagName: string,
    updates: Partial<Omit<FeatureFlag, 'platform' | 'environment' | 'flagName' | 'createdAt'>>
  ): Promise<FeatureFlag | null> {
    return featureFlagService.updateFeatureFlag(platform, environment, flagName, updates);
  }

  async deleteFeatureFlag(platform: string, environment: string, flagName: string): Promise<boolean> {
    return featureFlagService.deleteFeatureFlag(platform, environment, flagName);
  }
}
