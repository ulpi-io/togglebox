/**
 * Mongoose adapter for configuration version operations.
 *
 * @remarks
 * Implements `IConfigRepository` using Mongoose ODM for MongoDB.
 * Handles JSON serialization for configuration payloads and versioning logic.
 */

import { Version } from '@togglebox/core';
import { IConfigRepository, OffsetPaginationParams, TokenPaginationParams, OffsetPaginatedResult } from '../../interfaces';
import { ConfigVersionModel, PlatformModel } from './schemas';

/**
 * Mongoose implementation of configuration repository.
 *
 * @remarks
 * **JSON Handling:** Config stored as JSON string, parsed/stringified automatically.
 * **Versioning:** Auto-generated ISO-8601 timestamps ensure chronological ordering.
 * **Stable Versions:** Compound index (platform + environment + isStable) for fast queries.
 * **Lean Queries:** Uses .lean().select() for performance when only ID needed.
 */
export class MongooseConfigRepository implements IConfigRepository {
  /**
   * Creates a new configuration version.
   *
   * @param version - Version data (versionTimestamp and createdAt are auto-generated)
   * @returns Created version with generated timestamp
   *
   * @remarks
   * **PERFORMANCE NOTE**: Uses lean query to get only platformId instead of full document.
   * Controller validation ensures platform exists, but we still need the ID for foreign key.
   *
   * @throws {Error} If version timestamp collision occurs (duplicate key error)
   * @throws {Error} If platform not found (should not happen if controller validates correctly)
   */
  async createVersion(version: Omit<Version, 'versionTimestamp' | 'createdAt'>): Promise<Version> {
    const timestamp = new Date().toISOString();

    // Look up the platform to get its ID (lean query for performance)
    // Controller already validated platform exists, so this should always succeed
    const platformDoc = await PlatformModel.findOne({ name: version.platform })
      .select('_id') // Only select the ID field we need
      .lean() // Return plain object instead of Mongoose document
      .exec();

    if (!platformDoc) {
      // This should never happen if controller validates correctly
      throw new Error(`Platform ${version.platform} not found`);
    }

    try {
      const doc = await ConfigVersionModel.create({
        platform: version.platform,
        environment: version.environment,
        versionTimestamp: timestamp,
        platformId: platformDoc._id,
        versionLabel: version.versionLabel,
        isStable: version.isStable ?? false,
        config: JSON.stringify(version.config),
        createdBy: version.createdBy,
        createdAt: timestamp,
      });

      return {
        platform: doc.platform,
        environment: doc.environment,
        versionTimestamp: doc.versionTimestamp,
        versionLabel: doc.versionLabel,
        isStable: doc.isStable,
        config: JSON.parse(doc.config),
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
      };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        // Duplicate key error
        throw new Error(
          `Version with timestamp ${timestamp} already exists (extremely rare collision)`
        );
      }
      throw error;
    }
  }

  async getVersion(
    platform: string,
    environment: string,
    versionTimestamp: string
  ): Promise<Version | null> {
    const doc = await ConfigVersionModel.findOne({
      platform,
      environment,
      versionTimestamp,
    }).exec();

    if (!doc) {
      return null;
    }

    return {
      platform: doc.platform,
      environment: doc.environment,
      versionTimestamp: doc.versionTimestamp,
      versionLabel: doc.versionLabel,
      isStable: doc.isStable,
      config: JSON.parse(doc.config),
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
    };
  }

  async getLatestStableVersion(platform: string, environment: string): Promise<Version | null> {
    const doc = await ConfigVersionModel.findOne({
      platform,
      environment,
      isStable: true,
    })
      .sort({ versionTimestamp: -1 })
      .exec();

    if (!doc) {
      return null;
    }

    return {
      platform: doc.platform,
      environment: doc.environment,
      versionTimestamp: doc.versionTimestamp,
      versionLabel: doc.versionLabel,
      isStable: doc.isStable,
      config: JSON.parse(doc.config),
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
    };
  }

  async listVersions(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<OffsetPaginatedResult<Version>> {
    // Get total count for metadata
    const total = await ConfigVersionModel.countDocuments({ platform, environment }).exec();

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const docs = await ConfigVersionModel.find({ platform, environment })
        .sort({ versionTimestamp: -1 })
        .exec();

      const items = docs.map(doc => ({
        platform: doc.platform,
        environment: doc.environment,
        versionTimestamp: doc.versionTimestamp,
        versionLabel: doc.versionLabel,
        isStable: doc.isStable,
        config: JSON.parse(doc.config),
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
      }));

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const docs = await ConfigVersionModel.find({ platform, environment })
      .sort({ versionTimestamp: -1 })
      .skip(params.offset)
      .limit(params.limit)
      .exec();

    const items = docs.map(doc => ({
      platform: doc.platform,
      environment: doc.environment,
      versionTimestamp: doc.versionTimestamp,
      versionLabel: doc.versionLabel,
      isStable: doc.isStable,
      config: JSON.parse(doc.config),
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
    }));

    return { items, total };
  }

  async deleteVersion(
    platform: string,
    environment: string,
    versionTimestamp: string
  ): Promise<boolean> {
    const result = await ConfigVersionModel.deleteOne({
      platform,
      environment,
      versionTimestamp,
    }).exec();

    return result.deletedCount > 0;
  }
}
