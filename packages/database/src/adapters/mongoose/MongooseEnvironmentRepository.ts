/**
 * Mongoose adapter for environment operations.
 *
 * @remarks
 * Implements `IEnvironmentRepository` using Mongoose ODM for MongoDB.
 * Handles foreign key relationships with platforms using ObjectId references.
 */

import { Environment } from "@togglebox/core";
import {
  IEnvironmentRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  OffsetPaginatedResult,
} from "../../interfaces";
import { NotFoundError, ConflictError } from "@togglebox/shared";
import { EnvironmentModel, PlatformModel } from "./schemas";

/**
 * Mongoose implementation of environment repository.
 *
 * @remarks
 * **Foreign Keys:** Uses platformId ObjectId reference to Platform model.
 * **Composite Unique Constraint:** (platform + environment) prevents duplicates via compound index.
 * **Offset Pagination:** Uses Mongoose skip()/limit().
 */
export class MongooseEnvironmentRepository implements IEnvironmentRepository {
  /**
   * Creates a new environment with foreign key to platform.
   *
   * @throws {Error} If platform not found
   * @throws {Error} If environment already exists (MongoDB duplicate key error 11000)
   */
  async createEnvironment(
    environment: Omit<Environment, "createdAt">,
  ): Promise<Environment> {
    const createdAt = new Date().toISOString();

    // Look up the platform to get its ID
    const platformDoc = await PlatformModel.findOne({
      name: environment.platform,
    }).exec();

    if (!platformDoc) {
      throw new NotFoundError(`Platform ${environment.platform} not found`);
    }

    try {
      const doc = await EnvironmentModel.create({
        platform: environment.platform,
        environment: environment.environment,
        platformId: platformDoc._id,
        description: environment.description,
        createdAt,
      });

      return {
        platform: doc.platform,
        environment: doc.environment,
        description: doc.description,
        createdAt: doc.createdAt,
      };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        // Duplicate key error
        throw new ConflictError(
          `Environment ${environment.environment} already exists for platform ${environment.platform}`,
        );
      }
      throw error;
    }
  }

  /**
   * Gets environment by composite key (platform + environment).
   *
   * @remarks
   * Uses compound index for efficient lookup.
   */
  async getEnvironment(
    platform: string,
    environment: string,
  ): Promise<Environment | null> {
    const doc = await EnvironmentModel.findOne({
      platform,
      environment,
    }).exec();

    if (!doc) {
      return null;
    }

    return {
      platform: doc.platform,
      environment: doc.environment,
      description: doc.description,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Lists environments for a platform with optional pagination.
   *
   * @remarks
   * **Filtering:** Uses Mongoose find() with platform filter.
   * **Pagination:** Optional - fetches ALL items if not provided, single page if provided.
   * **Sorting:** By createdAt descending (newest first).
   */
  async listEnvironments(
    platform: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<OffsetPaginatedResult<Environment>> {
    // Get total count for metadata
    const total = await EnvironmentModel.countDocuments({ platform }).exec();

    // If no pagination requested, fetch ALL items
    if (!pagination) {
      const docs = await EnvironmentModel.find({ platform })
        .sort({ createdAt: -1 })
        .exec();

      const items = docs.map((doc) => ({
        platform: doc.platform,
        environment: doc.environment,
        description: doc.description,
        createdAt: doc.createdAt,
      }));

      return { items, total };
    }

    // Explicit pagination: return single page
    const params = pagination as OffsetPaginationParams;

    const docs = await EnvironmentModel.find({ platform })
      .sort({ createdAt: -1 })
      .skip(params.offset)
      .limit(params.limit)
      .exec();

    const items = docs.map((doc) => ({
      platform: doc.platform,
      environment: doc.environment,
      description: doc.description,
      createdAt: doc.createdAt,
    }));

    return { items, total };
  }

  async deleteEnvironment(
    platform: string,
    environment: string,
  ): Promise<boolean> {
    const result = await EnvironmentModel.deleteOne({
      platform,
      environment,
    }).exec();
    return result.deletedCount > 0;
  }
}
