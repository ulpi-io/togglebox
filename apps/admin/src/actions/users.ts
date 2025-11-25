/**
 * Server actions for user management.
 *
 * @module actions/users
 *
 * @remarks
 * These Next.js server actions handle user CRUD operations from the admin dashboard.
 * Users authenticate to the admin panel and have role-based access control (RBAC).
 *
 * **Role-Based Access Control (RBAC):**
 * - `admin`: Full access - can manage platforms, environments, configs, flags, users, API keys
 * - `developer`: Can manage platforms, environments, configs, and flags, but not users or API keys
 * - `viewer`: Read-only access - can view all resources but cannot create, update, or delete
 *
 * **Authentication Flow:**
 * Users authenticate via JWT tokens. After successful login, a JWT token is issued
 * and stored in an HTTP-only cookie for session management.
 *
 * **Security:**
 * - Passwords are hashed with bcrypt before storage
 * - Password requirements enforced via Zod schema validation
 * - Only admins can create, update, or delete users
 * - Users cannot delete themselves (enforced by backend)
 * - Password reset tokens expire after 1 hour
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createUserApi, updateUserRoleApi, deleteUserApi } from '@/lib/api/users';
import { z } from 'zod';

/**
 * Zod schema for validating user creation form data.
 *
 * @remarks
 * Validates:
 * - email: Valid email format
 * - password: Minimum 8 characters with complexity requirements
 * - role: One of 'admin', 'developer', or 'viewer'
 *
 * **Password Requirements:**
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 *
 * **Password Best Practices:**
 * - Recommend 12+ characters for admin users
 * - Consider requiring special characters for production
 * - Enforce password rotation every 90 days for admin users
 * - Prevent password reuse (last 5 passwords)
 */
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['admin', 'developer', 'viewer']),
});

/**
 * Creates a new user with email, password, and role.
 *
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing email, password, and role
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Form Fields:**
 * - `email`: User's email address (used for login and notifications)
 * - `password`: Initial password (user should change on first login)
 * - `role`: Access level - 'admin', 'developer', or 'viewer'
 *
 * **Role Permissions:**
 * - **admin**: Full access to all features including user management
 * - **developer**: Can manage platforms, environments, configs, and feature flags
 * - **viewer**: Read-only access to all resources
 *
 * **Security:**
 * - Password is hashed with bcrypt before storage (never stored in plain text)
 * - Email must be unique across all users
 * - Only admin users can create new users
 * - Consider sending welcome email with password reset link
 *
 * **Best Practices:**
 * - Use role of least privilege (start with 'viewer', escalate as needed)
 * - Require users to change password on first login
 * - Send account creation notification to user's email
 * - Document user creation in audit logs
 *
 * **Side Effects:**
 * - Creates user via backend API
 * - Revalidates Next.js cache for users list page
 * - User can immediately log in with provided credentials
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If API call fails or email already exists (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('email', 'developer@example.com');
 * formData.append('password', 'SecurePass123');
 * formData.append('role', 'developer');
 *
 * const result = await createUserAction(null, formData);
 * if (result.success) {
 *   console.log(result.message); // "User \"developer@example.com\" created successfully"
 *   // Send welcome email to user
 * } else {
 *   console.error(result.error); // "Email already exists" or validation errors
 * }
 * ```
 */
export async function createUserAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = createUserSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
    });

    await createUserApi(data.email, data.password, data.role);

    revalidatePath('/users');

    return {
      success: true,
      message: `User "${data.email}" created successfully`,
    };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Updates a user's role (admin, developer, or viewer).
 *
 * @param userId - Unique identifier of the user to update
 * @param role - New role to assign ('admin', 'developer', or 'viewer')
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Role Changes:**
 * - Role changes take effect immediately for new requests
 * - Existing JWT tokens maintain old permissions until expiration
 * - User may need to re-login to see new permissions (depending on token TTL)
 *
 * **Security Considerations:**
 * - Only admin users can update user roles
 * - Cannot change your own role (must be done by another admin)
 * - Downgrading admin to developer/viewer removes user management access
 * - Upgrading viewer to developer/admin grants write permissions
 *
 * **Audit Requirements:**
 * - Log all role changes with timestamp and admin user who made the change
 * - Notify user of role change via email
 * - Document reason for role change in audit logs
 *
 * **Best Practices:**
 * - Review user roles quarterly
 * - Remove admin access when no longer needed
 * - Use principle of least privilege
 * - Require manager approval for admin role assignments
 *
 * **Side Effects:**
 * - Updates user role via backend API
 * - Revalidates Next.js cache for users list page
 * - User's new permissions apply to subsequent requests
 *
 * @throws {Error} If API call fails or user doesn't exist (caught and returned as error state)
 *
 * @example
 * ```ts
 * // Promote developer to admin
 * const result1 = await updateUserRoleAction('user-id-123', 'admin');
 * if (result1.success) {
 *   console.log(result1.message); // "User role updated to admin"
 * }
 *
 * // Demote admin to viewer (e.g., employee leaving team)
 * const result2 = await updateUserRoleAction('user-id-456', 'viewer');
 * ```
 */
export async function updateUserRoleAction(
  userId: string,
  role: 'admin' | 'developer' | 'viewer'
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await updateUserRoleApi(userId, role);

    revalidatePath('/users');

    return {
      success: true,
      message: `User role updated to ${role}`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes a user permanently.
 *
 * @param userId - Unique identifier of the user to delete
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Warning:**
 * Deleting a user is permanent and:
 * - Removes user's access to the admin dashboard immediately
 * - Invalidates user's current JWT session tokens
 * - Retains audit logs of user's actions (user ID references remain)
 * - Cannot be undone
 *
 * **Security:**
 * - Only admin users can delete users
 * - Users cannot delete themselves (enforced by backend)
 * - Last remaining admin cannot be deleted (enforced by backend)
 *
 * **Best Practices:**
 * Before deleting a user:
 * 1. Verify user is no longer with the organization
 * 2. Transfer ownership of any resources they created
 * 3. Review and document their recent actions in audit logs
 * 4. Consider deactivating instead of deleting (if soft-delete is implemented)
 * 5. Notify team of user removal
 *
 * **Alternatives to Deletion:**
 * - Downgrade to 'viewer' role (read-only access)
 * - Implement account deactivation (soft delete)
 * - Set account expiration date
 *
 * **Side Effects:**
 * - Deletes user from database via backend API
 * - Revalidates Next.js cache for users list page
 * - Invalidates user's JWT tokens immediately
 * - User receives 401 Unauthorized on next request
 *
 * @throws {Error} If API call fails, user doesn't exist, or user is last admin (caught and returned as error state)
 *
 * @example
 * ```ts
 * // Delete user who left the organization
 * const result = await deleteUserAction('user-id-789');
 * if (result.success) {
 *   console.log(result.message); // "User deleted successfully"
 * } else {
 *   console.error(result.error); // "Cannot delete last admin" or "User not found"
 * }
 * ```
 */
export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await deleteUserApi(userId);

    revalidatePath('/users');

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
