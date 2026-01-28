import { IUserRepository } from "../../interfaces/IUserRepository";
import {
  User,
  CreateUserData,
  UpdateUserData,
  UserRole,
} from "../../models/User";
import { UserModel, IUserDocument } from "./schemas";

/**
 * MongoDB implementation of user repository using Mongoose.
 *
 * @implements {IUserRepository}
 *
 * @remarks
 * **Mongoose ORM Features:**
 * - Schema validation before save
 * - Automatic ObjectId generation for `_id`
 * - Auto-managed timestamps (createdAt, updatedAt)
 * - Indexes managed via schema definition
 *
 * **Access Patterns:**
 * 1. Find by ID: `findById()` - Uses indexed `_id`
 * 2. Find by email: `findOne({ email })` - Uses unique email index
 * 3. List users: `find()` with sort, skip, limit
 *
 * **Performance:**
 * - All lookups use indexes (fast)
 * - List operation supports efficient pagination
 * - No N+1 queries (single collection, no joins)
 *
 * **Cascade Deletes:**
 * No automatic cascades - application must manually delete related:
 * - API keys via `ApiKeyModel.deleteMany({ userId })`
 * - Reset tokens via `PasswordResetTokenModel.deleteMany({ userId })`
 */
export class MongoDBUserRepository implements IUserRepository {
  async create(data: CreateUserData): Promise<User> {
    const user = await UserModel.create(data);
    return this.mapToUser(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await UserModel.findById(id);
    return user ? this.mapToUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email });
    return user ? this.mapToUser(user) : null;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const user = await UserModel.findByIdAndUpdate(id, data, { new: true });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    return this.mapToUser(user);
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<{ users: User[]; total: number }> {
    const filter = options?.role ? { role: options.role } : {};
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users: users.map((user) => this.mapToUser(user)),
      total,
    };
  }

  /**
   * Count users by role.
   * SECURITY: Used to prevent demoting the last admin user.
   */
  async countByRole(role: string): Promise<number> {
    return UserModel.countDocuments({ role });
  }

  /**
   * Map Mongoose document to User domain model.
   *
   * @param doc - Mongoose document from database
   * @returns User model with string ID
   *
   * @remarks
   * **ObjectId Conversion:**
   * Converts Mongoose `_id` (ObjectId) to string for domain model.
   *
   * **Type Safety:**
   * - `role` cast to UserRole enum
   * - Timestamps already Date objects from Mongoose
   */
  private mapToUser(doc: IUserDocument): User {
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role as UserRole,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
