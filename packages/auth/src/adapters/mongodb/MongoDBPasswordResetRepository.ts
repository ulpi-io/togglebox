import { IPasswordResetRepository } from '../../interfaces/IPasswordResetRepository';
import {
  PasswordResetToken,
  CreatePasswordResetTokenData,
} from '../../models/PasswordResetToken';
import { PasswordResetTokenModel, IPasswordResetTokenDocument } from './schemas';

/**
 * MongoDB implementation of password reset token repository using Mongoose.
 *
 * @implements {IPasswordResetRepository}
 *
 * @remarks
 * **Mongoose ORM Features:**
 * - Schema validation for required fields
 * - Unique index on tokenHash prevents duplicates
 * - Indexes on userId and expiresAt for efficient queries
 * - Auto-managed createdAt timestamp
 *
 * **Access Patterns:**
 * 1. Find by ID: `findById()` - Uses indexed `_id`
 * 2. Find by hash: `findOne({ tokenHash })` - Uses unique tokenHash index
 * 3. Find valid by user: `find({ userId, expiresAt: { $gt: now } })` - Uses compound filter
 * 4. Delete expired: `deleteMany({ expiresAt: { $lt: now } })` - Uses expiresAt index
 *
 * **Performance:**
 * - All lookups use indexes
 * - Efficient range queries on expiresAt for expiration checks
 * - Bulk delete for expired tokens cleanup
 *
 * **Token Lifecycle:**
 * - Created with 1-hour expiration
 * - Single-use (deleted after password reset)
 * - Cleanup via `deleteExpired()` cron job
 */
export class MongoDBPasswordResetRepository implements IPasswordResetRepository {
  async create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
    const token = await PasswordResetTokenModel.create({
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });
    return this.mapToPasswordResetToken(token);
  }

  async findById(id: string): Promise<PasswordResetToken | null> {
    const token = await PasswordResetTokenModel.findById(id);
    return token ? this.mapToPasswordResetToken(token) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const token = await PasswordResetTokenModel.findOne({ tokenHash });
    return token ? this.mapToPasswordResetToken(token) : null;
  }

  async findValidByUser(userId: string): Promise<PasswordResetToken[]> {
    const now = new Date();
    const tokens = await PasswordResetTokenModel.find({
      userId,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    return tokens.map((token) => this.mapToPasswordResetToken(token));
  }

  async delete(id: string): Promise<void> {
    await PasswordResetTokenModel.findByIdAndDelete(id);
  }

  async deleteByUser(userId: string): Promise<void> {
    await PasswordResetTokenModel.deleteMany({ userId });
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await PasswordResetTokenModel.deleteMany({
      expiresAt: { $lt: now },
    });
    return result.deletedCount || 0;
  }

  /**
   * Map Mongoose document to PasswordResetToken domain model.
   *
   * @param doc - Mongoose document from database
   * @returns Password reset token model with string ID
   *
   * @remarks
   * **ObjectId Conversion:**
   * Converts Mongoose `_id` (ObjectId) to string for domain model.
   *
   * **Date Objects:**
   * All date fields already Date objects from Mongoose (no parsing needed).
   */
  private mapToPasswordResetToken(doc: IPasswordResetTokenDocument): PasswordResetToken {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  }
}
