/**
 * User repository interface for authentication system.
 *
 * @remarks
 * Defines the contract that all database adapters must implement for user operations.
 * Supports CRUD operations, email lookup, and paginated listing with role filtering.
 */

import type { User, CreateUserData, UpdateUserData } from "../models/User";

/**
 * User repository interface.
 *
 * @remarks
 * All database adapters (Prisma, DynamoDB, MongoDB) must implement this interface.
 *
 * **Key Operations:**
 * - User CRUD (create, read, update, delete)
 * - Email-based lookup for authentication
 * - Paginated listing with optional role filtering
 */
export interface IUserRepository {
  /**
   * Creates a new user with hashed password.
   *
   * @param data - User creation data (password should be hashed before calling)
   * @returns Created user with generated ID and timestamps
   * @throws {Error} If email already exists (duplicate)
   */
  create(data: CreateUserData): Promise<User>;

  /**
   * Finds user by unique ID.
   *
   * @returns User if found, null otherwise
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds user by email address.
   *
   * @remarks
   * Used for login authentication and email uniqueness checks.
   *
   * @returns User if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Updates user fields.
   *
   * @param id - User ID
   * @param data - Partial user data to update
   * @returns Updated user
   * @throws {Error} If user not found
   */
  update(id: string, data: UpdateUserData): Promise<User>;

  /**
   * Deletes user permanently.
   *
   * @remarks
   * **Cascade Behavior:** Also deletes associated API keys and password reset tokens.
   *
   * @param id - User ID
   * @throws {Error} If user not found
   */
  delete(id: string): Promise<void>;

  /**
   * Lists users with optional pagination and filtering.
   *
   * @param options - Pagination and filter options
   * @returns Paginated user list with total count
   *
   * @remarks
   * **Default Pagination:** limit=20, offset=0
   * **Role Filtering:** Optional filter by user role (admin, editor, viewer)
   */
  list(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<{ users: User[]; total: number }>;

  /**
   * Counts users with a specific role.
   *
   * @param role - Role to count (admin, developer, viewer)
   * @returns Number of users with the specified role
   *
   * @remarks
   * SECURITY: Used to prevent demoting the last admin user.
   */
  countByRole(role: string): Promise<number>;
}
