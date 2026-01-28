/**
 * Mongoose adapter for platform operations.
 *
 * @remarks
 * Implements `IPlatformRepository` using Mongoose ODM for MongoDB.
 * Uses Mongoose document IDs (_id) for platform identification.
 */

import { Platform } from "@togglebox/core";
import {
  IPlatformRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  OffsetPaginatedResult,
} from "../../interfaces";
import { ConflictError } from "@togglebox/shared";
import { PlatformModel } from "./schemas";

/**
 * Mongoose implementation of platform repository.
 *
 * @remarks
 * **MongoDB IDs:** Uses Mongoose ObjectId converted to string for platform.id.
 * **Offset Pagination:** Uses Mongoose skip()/limit() (same as Prisma).
 * **Error Codes:** MongoDB error code 11000 indicates duplicate key.
 */
export class MongoosePlatformRepository implements IPlatformRepository {
  /**
   * Creates a new platform with auto-generated MongoDB ObjectId.
   *
   * @throws {Error} If platform with same name already exists (MongoDB duplicate key error 11000)
   */
  async createPlatform(platform: Omit<Platform, "id">): Promise<Platform> {
    const createdAt = new Date().toISOString();

    try {
      const doc = await PlatformModel.create({
        name: platform.name,
        description: platform.description,
        createdAt,
      });

      return {
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        createdAt: doc.createdAt,
      };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        // Duplicate key error
        throw new ConflictError(`Platform ${platform.name} already exists`);
      }
      throw error;
    }
  }

  /**
   * Gets platform by unique name.
   *
   * @remarks
   * Uses Mongoose findOne() for indexed lookup.
   */
  async getPlatform(name: string): Promise<Platform | null> {
    const doc = await PlatformModel.findOne({ name }).exec();

    if (!doc) {
      return null;
    }

    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Lists platforms with optional pagination.
   *
   * @remarks
   * **Pagination:** Optional - fetches ALL items if not provided, uses skip()/limit() if provided.
   * **Sorting:** Results sorted by createdAt descending (newest first).
   * **Count Query:** Separate countDocuments() for total.
   */
  async listPlatforms(
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<OffsetPaginatedResult<Platform>> {
    // SECURITY: If no pagination requested, apply hard limit to prevent unbounded queries
    // Skip COUNT query since we're fetching all items anyway
    if (!pagination) {
      const HARD_LIMIT = 100;
      const docs = await PlatformModel.find()
        .sort({ createdAt: -1 })
        .limit(HARD_LIMIT)
        .exec();

      const items = docs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        createdAt: doc.createdAt,
      }));

      // Total is derived from items.length - no extra COUNT query needed
      return { items, total: items.length };
    }

    // Explicit pagination: get total count for UI (run in parallel with query)
    const params = pagination as OffsetPaginationParams;

    const [docs, total] = await Promise.all([
      PlatformModel.find()
        .sort({ createdAt: -1 })
        .skip(params.offset)
        .limit(params.limit)
        .exec(),
      PlatformModel.countDocuments().exec(),
    ]);

    const items = docs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      createdAt: doc.createdAt,
    }));

    return { items, total };
  }

  async deletePlatform(name: string): Promise<boolean> {
    const result = await PlatformModel.deleteOne({ name }).exec();
    return result.deletedCount > 0;
  }
}
