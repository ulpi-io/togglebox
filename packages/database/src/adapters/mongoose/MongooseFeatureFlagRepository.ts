/**
 * Mongoose adapter for feature flag operations.
 *
 * @remarks
 * Implements `IFeatureFlagRepository` using Mongoose ODM for MongoDB.
 * Handles JSON array serialization for targeting fields and phased rollout logic.
 */

import { FeatureFlag } from '@togglebox/core';
import { IFeatureFlagRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';
import { FeatureFlagModel, PlatformModel } from './schemas';

/**
 * Mongoose implementation of feature flag repository.
 *
 * @remarks
 * **JSON Array Handling:** Targeting arrays stored as JSON strings, parsed/stringified automatically.
 * **Dual-Mode Pagination:** Returns array if no pagination, returns paginated result if pagination provided.
 * **Phased Rollouts:** Supports simple, percentage, and targeted rollout strategies.
 * **Private Mapper:** Uses `mapToFeatureFlag()` helper for consistent deserialization.
 */
export class MongooseFeatureFlagRepository implements IFeatureFlagRepository {
  /**
   * Creates a new feature flag.
   *
   * @param featureFlag - Feature flag data (createdAt and updatedAt are auto-generated)
   * @returns Created feature flag with generated timestamps
   *
   * @remarks
   * **PERFORMANCE NOTE**: Uses lean query to get only platformId instead of full document.
   * Controller validation ensures platform exists, but we still need the ID for foreign key.
   *
   * @throws {Error} If feature flag already exists (duplicate key error)
   * @throws {Error} If platform not found (should not happen if controller validates correctly)
   */
  async createFeatureFlag(
    featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    const timestamp = new Date().toISOString();

    // Look up the platform to get its ID (lean query for performance)
    // Controller already validated platform exists, so this should always succeed
    const platformDoc = await PlatformModel.findOne({ name: featureFlag.platform })
      .select('_id') // Only select the ID field we need
      .lean() // Return plain object instead of Mongoose document
      .exec();

    if (!platformDoc) {
      // This should never happen if controller validates correctly
      throw new Error(`Platform ${featureFlag.platform} not found`);
    }

    try{
      const doc = await FeatureFlagModel.create({
        platform: featureFlag.platform,
        environment: featureFlag.environment,
        flagName: featureFlag.flagName,
        platformId: platformDoc._id,
        enabled: featureFlag.enabled ?? false,
        description: featureFlag.description,
        createdBy: featureFlag.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        rolloutType: featureFlag.rolloutType ?? 'simple',
        rolloutPercentage: featureFlag.rolloutPercentage,
        targetUserIds: JSON.stringify(featureFlag.targetUserIds ?? []),
        excludeUserIds: JSON.stringify(featureFlag.excludeUserIds ?? []),
        targetCountries: JSON.stringify(featureFlag.targetCountries ?? []),
        targetLanguages: JSON.stringify(featureFlag.targetLanguages ?? []),
      });

      return this.mapToFeatureFlag(doc);
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        // Duplicate key error
        throw new Error(
          `Feature flag ${featureFlag.flagName} already exists for platform ${featureFlag.platform} and environment ${featureFlag.environment}`
        );
      }
      throw error;
    }
  }

  async getFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<FeatureFlag | null> {
    const doc = await FeatureFlagModel.findOne({
      platform,
      environment,
      flagName,
    }).exec();

    if (!doc) {
      return null;
    }

    return this.mapToFeatureFlag(doc);
  }

  async listFeatureFlags(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<FeatureFlag>> {
    // Get total count for metadata
    const total = await FeatureFlagModel.countDocuments({ platform, environment }).exec();

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const docs = await FeatureFlagModel.find({ platform, environment })
        .sort({ flagName: 1 })
        .exec();

      const items = docs.map(doc => this.mapToFeatureFlag(doc));

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const docs = await FeatureFlagModel.find({ platform, environment })
      .sort({ flagName: 1 })
      .skip(params.offset)
      .limit(params.limit)
      .exec();

    const items = docs.map(doc => this.mapToFeatureFlag(doc));

    return { items, total };
  }

  async updateFeatureFlag(
    platform: string,
    environment: string,
    flagName: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag | null> {
    const updatedAt = new Date().toISOString();

    // Serialize array fields if present
    const serializedUpdates: Record<string, unknown> = { ...updates };
    if (updates.targetUserIds)
      serializedUpdates['targetUserIds'] = JSON.stringify(updates.targetUserIds);
    if (updates.excludeUserIds)
      serializedUpdates['excludeUserIds'] = JSON.stringify(updates.excludeUserIds);
    if (updates.targetCountries)
      serializedUpdates['targetCountries'] = JSON.stringify(updates.targetCountries);
    if (updates.targetLanguages)
      serializedUpdates['targetLanguages'] = JSON.stringify(updates.targetLanguages);

    const doc = await FeatureFlagModel.findOneAndUpdate(
      { platform, environment, flagName },
      {
        ...serializedUpdates,
        rolloutType: updates.rolloutType,
        updatedAt,
      },
      { new: true }
    ).exec();

    if (!doc) {
      return null;
    }

    return this.mapToFeatureFlag(doc);
  }

  async deleteFeatureFlag(
    platform: string,
    environment: string,
    flagName: string
  ): Promise<boolean> {
    const result = await FeatureFlagModel.deleteOne({
      platform,
      environment,
      flagName,
    }).exec();

    return result.deletedCount > 0;
  }

  /**
   * Maps Mongoose document to FeatureFlag domain type.
   *
   * @param doc - Raw Mongoose document
   * @returns Typed FeatureFlag with deserialized JSON arrays
   *
   * @remarks
   * **JSON Deserialization:**
   * Parses JSON string arrays back to arrays.
   * Empty arrays are converted to undefined for cleaner API responses.
   */
  private mapToFeatureFlag(doc: unknown): FeatureFlag {
    const d = doc as Record<string, unknown>;
    const targetUserIds = JSON.parse((d['targetUserIds'] as string) || '[]') as string[];
    const excludeUserIds = JSON.parse((d['excludeUserIds'] as string) || '[]') as string[];
    const targetCountries = JSON.parse((d['targetCountries'] as string) || '[]') as string[];
    const targetLanguages = JSON.parse((d['targetLanguages'] as string) || '[]') as string[];

    return {
      platform: d['platform'] as string,
      environment: d['environment'] as string,
      flagName: d['flagName'] as string,
      enabled: d['enabled'] as boolean,
      description: d['description'] as string | undefined,
      createdBy: d['createdBy'] as string,
      createdAt: d['createdAt'] as string,
      updatedAt: d['updatedAt'] as string | undefined,
      rolloutType: d['rolloutType'] as 'simple' | 'percentage' | 'targeted',
      rolloutPercentage: d['rolloutPercentage'] as number | undefined,
      targetUserIds: targetUserIds.length > 0 ? targetUserIds : undefined,
      excludeUserIds: excludeUserIds.length > 0 ? excludeUserIds : undefined,
      targetCountries: targetCountries.length > 0 ? targetCountries : undefined,
      targetLanguages: targetLanguages.length > 0 ? targetLanguages : undefined,
    };
  }
}
