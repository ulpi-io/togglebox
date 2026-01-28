/**
 * User service for authentication and user management.
 *
 * @module services/UserService
 *
 * @remarks
 * Provides business logic for user operations:
 * - User registration with password hashing
 * - Login with JWT token generation
 * - Profile management
 * - Password changes
 * - User listing and deletion
 *
 * **Security:**
 * - Passwords are hashed with bcrypt before storage
 * - PublicUser type excludes passwordHash from responses
 * - Generic error messages prevent user enumeration
 */

import { IUserRepository } from "../interfaces/IUserRepository";
import { IApiKeyRepository } from "../interfaces/IApiKeyRepository";
import { IPasswordResetRepository } from "../interfaces/IPasswordResetRepository";
import { User, PublicUser, UserRole } from "../models/User";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateToken } from "../utils/jwt";

/**
 * User registration input data.
 *
 * @remarks
 * Password will be hashed before storage.
 * Role defaults to 'viewer' if not provided.
 */
export interface RegisterUserData {
  /** User display name */
  name: string;

  /** User email address (must be unique) */
  email: string;

  /** Plain text password (will be hashed) */
  password: string;

  /** User role (defaults to 'viewer') */
  role?: UserRole;
}

/**
 * User login input data.
 */
export interface LoginUserData {
  /** User email address */
  email: string;

  /** Plain text password */
  password: string;
}

/**
 * User login response with user data and JWT token.
 */
export interface LoginResponse {
  /** User data without passwordHash */
  user: PublicUser;

  /** JWT token for authentication */
  token: string;
}

/**
 * User profile update data.
 *
 * @remarks
 * **Security:** Direct passwordHash updates bypass validation.
 * Use {@link UserService.changePassword} for password changes instead.
 *
 * **Profile Updates:**
 * - `name`: User display name (any authenticated user can update their own)
 * - `role`: User role (admin-only, use separate endpoint)
 */
export interface UpdateProfileData {
  /** Update user display name */
  name?: string;

  /** Update user role */
  role?: UserRole;

  /** Update password hash (use changePassword instead for validation) */
  passwordHash?: string;
}

/**
 * User service for authentication and user management.
 *
 * @remarks
 * **Dependency Injection:**
 * Requires {@link IUserRepository} for database operations.
 *
 * **Security Features:**
 * - Password hashing with bcrypt
 * - JWT token generation for sessions
 * - User enumeration prevention (generic error messages)
 * - PublicUser responses exclude passwordHash
 */
export class UserService {
  private apiKeyRepository?: IApiKeyRepository;
  private passwordResetRepository?: IPasswordResetRepository;

  constructor(
    private userRepository: IUserRepository,
    apiKeyRepository?: IApiKeyRepository,
    passwordResetRepository?: IPasswordResetRepository,
  ) {
    this.apiKeyRepository = apiKeyRepository;
    this.passwordResetRepository = passwordResetRepository;
  }

  /**
   * Register a new user with email and password.
   *
   * @param data - Registration data (email, password, optional role)
   * @returns Public user data (without password hash)
   * @throws {Error} If email already exists
   *
   * @remarks
   * **Process:**
   * 1. Check if email already exists (prevent duplicates)
   * 2. Hash password with bcrypt
   * 3. Create user with default role 'viewer' if not specified
   * 4. Return public user data (passwordHash excluded)
   *
   * @example
   * ```typescript
   * const user = await userService.register({
   *   email: 'user@example.com',
   *   password: 'SecurePass123',
   *   role: 'developer'
   * });
   * ```
   */
  async register(data: RegisterUserData): Promise<PublicUser> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role || "viewer", // Default role is viewer
    });

    // Return public user data (without password hash)
    return this.toPublicUser(user);
  }

  /**
   * Authenticate user and generate JWT token.
   *
   * @param data - Login credentials (email and password)
   * @returns User data and JWT token
   * @throws {Error} 'Invalid email or password' - Generic message for security
   *
   * @remarks
   * **Security:**
   * - Generic error message prevents user enumeration
   * - Password verified with bcrypt (timing-safe comparison)
   * - JWT token generated with user claims
   *
   * **Process:**
   * 1. Find user by email
   * 2. Verify password hash
   * 3. Generate JWT token
   * 4. Return user data + token
   *
   * @example
   * ```typescript
   * const { user, token } = await userService.login({
   *   email: 'user@example.com',
   *   password: 'SecurePass123'
   * });
   * // Use token in Authorization header: Bearer <token>
   * ```
   */
  async login(data: LoginUserData): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      data.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = generateToken(user);

    return {
      user: this.toPublicUser(user),
      token,
    };
  }

  /**
   * Get user by unique ID.
   *
   * @param id - User unique identifier
   * @returns Public user data or null if not found
   */
  async getUserById(id: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findById(id);
    return user ? this.toPublicUser(user) : null;
  }

  /**
   * Get user by email address.
   *
   * @param email - User email address
   * @returns Public user data or null if not found
   */
  async getUserByEmail(email: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? this.toPublicUser(user) : null;
  }

  /**
   * Update user profile (role or password hash).
   *
   * @param userId - User unique identifier
   * @param data - Profile updates (role or passwordHash)
   * @returns Updated public user data
   *
   * @remarks
   * **Security:** For password changes, prefer {@link changePassword}
   * which validates the current password first.
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<PublicUser> {
    const user = await this.userRepository.update(userId, data);
    return this.toPublicUser(user);
  }

  /**
   * Change user password with current password verification.
   *
   * @param userId - User unique identifier
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @throws {Error} 'User not found' if user doesn't exist
   * @throws {Error} 'Current password is incorrect' if verification fails
   *
   * @remarks
   * **Security:**
   * - Requires current password verification
   * - New password is hashed with bcrypt
   * - Safer than direct passwordHash updates
   *
   * @example
   * ```typescript
   * await userService.changePassword(
   *   userId,
   *   'OldPass123',
   *   'NewSecurePass456'
   * );
   * ```
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValidPassword = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });
  }

  /**
   * Delete user permanently.
   *
   * @param userId - User unique identifier
   *
   * @remarks
   * **SECURITY: Cascade Delete:**
   * Also deletes associated API keys and password reset tokens
   * to prevent orphaned data and ensure complete cleanup.
   */
  async deleteUser(userId: string): Promise<void> {
    // SECURITY: Delete related data before deleting user (cascade delete)
    // This prevents orphaned API keys and reset tokens
    if (this.apiKeyRepository) {
      await this.apiKeyRepository.deleteByUser(userId);
    }
    if (this.passwordResetRepository) {
      await this.passwordResetRepository.deleteByUser(userId);
    }

    // Delete the user record
    await this.userRepository.delete(userId);
  }

  /**
   * List all users with pagination and filtering.
   *
   * @param options - Pagination and filter options
   * @returns Paginated list of public user data
   *
   * @remarks
   * **Admin Only:** This operation should be restricted to admin users.
   * Check permissions in controller before calling.
   *
   * **Default Pagination:** limit=20, offset=0
   */
  async listUsers(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<{ users: PublicUser[]; total: number }> {
    const result = await this.userRepository.list(options);
    return {
      users: result.users.map((user) => this.toPublicUser(user)),
      total: result.total,
    };
  }

  /**
   * Count users by role.
   *
   * @param role - User role to count (admin, developer, viewer)
   * @returns Number of users with the specified role
   *
   * @remarks
   * **SECURITY:** Used to prevent demoting the last admin user.
   */
  async countByRole(role: string): Promise<number> {
    return this.userRepository.countByRole(role);
  }

  /**
   * Convert User to PublicUser (remove passwordHash).
   *
   * @param user - Full user entity with passwordHash
   * @returns Public user data without passwordHash
   *
   * @remarks
   * **Security:** Ensures passwordHash is never exposed in API responses.
   */
  private toPublicUser(user: User): PublicUser {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
