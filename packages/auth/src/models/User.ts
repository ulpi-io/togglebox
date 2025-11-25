/**
 * User model and role-based access control (RBAC) types.
 *
 * @module models/User
 *
 * @remarks
 * Defines user authentication and authorization data structures.
 * Implements role-based access control with three roles: admin, developer, viewer.
 *
 * **Security Model:**
 * - Passwords are hashed with bcrypt before storage
 * - Email is unique and used for login
 * - Roles define granular permissions for resource access
 */

/**
 * User entity with authentication and authorization data.
 *
 * @remarks
 * **Security:**
 * - `passwordHash` is never returned in API responses (use `PublicUser` instead)
 * - `email` is unique and used for login authentication
 * - `role` determines permissions via `USER_PERMISSIONS` mapping
 */
export interface User {
  /** Unique user identifier (UUID) */
  id: string;

  /** User's email address (unique, used for login) */
  email: string;

  /** Bcrypt hashed password (never expose in API responses) */
  passwordHash: string;

  /** User's role for permission checking */
  role: UserRole;

  /** Timestamp when user was created */
  createdAt: Date;

  /** Timestamp when user was last updated */
  updatedAt: Date;
}

/**
 * User roles with different permission levels.
 *
 * @remarks
 * **Role Hierarchy:**
 * - **admin**: Full access (config CRUD, user management, API key management)
 * - **developer**: Write access (config CRUD, cache invalidation)
 * - **viewer**: Read-only access (config read only)
 *
 * Permissions are defined in {@link USER_PERMISSIONS}.
 */
export type UserRole = 'admin' | 'developer' | 'viewer';

/**
 * User data for creation (without system-generated fields).
 *
 * @remarks
 * Excludes `id`, `createdAt`, and `updatedAt` as these are auto-generated.
 * `passwordHash` must be pre-hashed with bcrypt before passing to repository.
 */
export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * User data for updates (partial, without system fields).
 *
 * @remarks
 * - Excludes `id`, `email`, `createdAt`, `updatedAt` (immutable)
 * - All fields are optional (partial update)
 * - `passwordHash` can be updated for password changes
 */
export type UpdateUserData = Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>;

/**
 * Public user data (safe to return in API responses).
 *
 * @remarks
 * **Security:** Excludes `passwordHash` to prevent password hash leakage.
 * Use this type for all API responses that include user data.
 */
export type PublicUser = Omit<User, 'passwordHash'>;

/**
 * User permissions based on role.
 *
 * @remarks
 * **Role-Based Access Control (RBAC) Mapping:**
 *
 * Permission format: `resource:action`
 * - config: Configuration management
 * - cache: Cache invalidation
 * - user: User management
 * - apikey: API key management
 * - member: Team member management (cloud-only)
 *
 * **Permission Hierarchy:**
 * - admin: All permissions (11)
 * - developer: Config + cache + member:read (5)
 * - viewer: Read-only (2)
 */
export const USER_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'config:read',
    'config:write',
    'config:update',
    'config:delete',
    'cache:invalidate',
    'user:manage',
    'apikey:manage',
    'member:read',
    'member:invite',
    'member:manage',
    'member:remove',
  ],
  developer: [
    'config:read',
    'config:write',
    'config:update',
    'cache:invalidate',
    'member:read',
  ],
  viewer: [
    'config:read',
    'member:read',
  ],
};

/**
 * Check if a user has a specific permission.
 *
 * @param user - User to check permissions for
 * @param permission - Permission string in format `resource:action`
 * @returns true if user's role grants the permission
 *
 * @remarks
 * Uses {@link USER_PERMISSIONS} mapping to determine access.
 * Returns false if role is invalid or permission not granted.
 *
 * @example
 * ```typescript
 * const user: User = { role: 'developer', ... };
 * userHasPermission(user, 'config:write'); // true
 * userHasPermission(user, 'user:manage'); // false (admin only)
 * ```
 */
export function userHasPermission(user: User, permission: string): boolean {
  const permissions = USER_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}
