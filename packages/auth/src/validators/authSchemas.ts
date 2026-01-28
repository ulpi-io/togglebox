/**
 * Zod validation schemas for authentication endpoints.
 *
 * @module validators/authSchemas
 *
 * @remarks
 * Provides runtime validation schemas using Zod for:
 * - User registration and login
 * - Password changes and resets
 * - API key creation
 *
 * **Type Safety:**
 * - Zod provides runtime validation AND compile-time types
 * - Use `z.infer<typeof schema>` to extract TypeScript types
 * - Validation middleware automatically parses and validates request bodies
 *
 * **Password Requirements:**
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */

import { z } from 'zod';

/**
 * User registration validation schema.
 *
 * @remarks
 * **Validation Rules:**
 * - **email**: Valid email format, 5-255 characters
 * - **password**: 8-128 chars, must contain uppercase, lowercase, and number
 *
 * **SECURITY:** Role is intentionally NOT allowed in public registration.
 * All users register as 'viewer' by default. Only admins can promote users.
 *
 * @example
 * ```typescript
 * const data = registerSchema.parse({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 *   name: 'John Doe'
 * });
 * ```
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  // SECURITY: Role is NOT allowed in public registration - all users start as 'viewer'
  // Only admins can change roles via the admin endpoints
});

/**
 * Type-safe registration data inferred from schema.
 */
export type RegisterData = z.infer<typeof registerSchema>;

/**
 * User login validation schema.
 *
 * @remarks
 * **Validation Rules:**
 * - **email**: Valid email format, minimum 5 characters
 * - **password**: Required, no minimum length (validates after hashing)
 *
 * Less strict than registration since password is already stored as hash.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Type-safe login data inferred from schema.
 */
export type LoginData = z.infer<typeof loginSchema>;

/**
 * Change password validation schema.
 *
 * @remarks
 * **Validation Rules:**
 * - **currentPassword**: Required (verifies user knows current password)
 * - **newPassword**: Same requirements as registration password
 *
 * Used for authenticated password changes (not forgot password flow).
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

/**
 * Type-safe change password data inferred from schema.
 */
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

/**
 * Update self profile validation schema.
 *
 * @remarks
 * Allows users to update their OWN profile information (non-sensitive fields only).
 * - `name`: Display name (any authenticated user can update their own)
 *
 * **SECURITY:** Role is intentionally NOT included to prevent privilege escalation.
 * Role changes require admin endpoint with user:manage permission.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  // SECURITY: Role is NOT allowed in self-update - prevents privilege escalation
  // Use admin endpoint PATCH /users/:id/role for role changes
});

/**
 * Admin update user profile schema (used by admins to update any user).
 *
 * @remarks
 * Allows admins to update user information including role.
 * Only accessible via admin endpoints with user:manage permission.
 */
export const adminUpdateUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  role: z.enum(['admin', 'developer', 'viewer']).optional(),
});

/**
 * Admin create user schema (used by admins to create new users with specific roles).
 *
 * @remarks
 * Extends registerSchema with optional role field.
 * Only accessible via admin endpoints with user:manage permission.
 */
export const adminCreateUserSchema = registerSchema.extend({
  role: z.enum(['admin', 'developer', 'viewer']).optional(),
});

/**
 * Type-safe admin create user data inferred from schema.
 */
export type AdminCreateUserData = z.infer<typeof adminCreateUserSchema>;

/**
 * Type-safe update profile data inferred from schema.
 */
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

/**
 * Password reset request validation schema.
 *
 * @remarks
 * **Flow:** Step 1 of password reset flow.
 * User provides email to receive reset link.
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Type-safe password reset request data inferred from schema.
 */
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset verification schema.
 *
 * @remarks
 * **Flow:** Step 2 of password reset flow.
 * User clicks link with token to verify it's valid and not expired.
 *
 * Token is 64-char hex string from {@link generateSecureToken}.
 */
export const passwordResetVerifySchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid token')
    .max(256, 'Invalid token'),
});

/**
 * Type-safe password reset verification data inferred from schema.
 */
export type PasswordResetVerifyData = z.infer<typeof passwordResetVerifySchema>;

/**
 * Password reset completion validation schema.
 *
 * @remarks
 * **Flow:** Step 3 of password reset flow.
 * User submits new password with reset token.
 *
 * **Validation:**
 * - Token must be valid and not expired
 * - New password must meet strength requirements
 */
export const passwordResetCompleteSchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid token')
    .max(256, 'Invalid token'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

/**
 * Type-safe password reset completion data inferred from schema.
 */
export type PasswordResetCompleteData = z.infer<typeof passwordResetCompleteSchema>;

/**
 * Create API key validation schema.
 *
 * @remarks
 * **Validation Rules:**
 * - **name**: Human-readable name, 1-100 characters
 * - **permissions**: Array of permission strings, 1-50 items
 * - **expiresAt**: Optional ISO datetime string, transformed to Date or null
 *
 * **Common Permissions:**
 * - `config:read`, `config:write`, `config:update`, `config:delete`
 * - `cache:invalidate`
 *
 * @example
 * ```typescript
 * const data = createApiKeySchema.parse({
 *   name: 'Production API',
 *   permissions: ['config:read', 'config:write'],
 *   expiresAt: '2025-12-31T23:59:59Z'
 * });
 * // data.expiresAt is a Date object
 * ```
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required')
    .max(50, 'Too many permissions'),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
});

/**
 * Type-safe API key creation data inferred from schema.
 *
 * @remarks
 * Note: `expiresAt` is transformed to `Date | null` by the schema.
 */
export type CreateApiKeyData = z.infer<typeof createApiKeySchema>;

/**
 * Validation middleware factory for Express routes.
 *
 * @param schema - Zod schema to validate request body against
 * @returns Express middleware function
 *
 * @remarks
 * **Behavior:**
 * - Validates `req.body` against provided Zod schema
 * - On success: Replaces `req.body` with validated data and calls `next()`
 * - On failure: Returns 422 response with validation error details
 *
 * **Response Format (error):**
 * ```json
 * {
 *   "success": false,
 *   "error": "Validation failed",
 *   "details": [
 *     { "field": "email", "message": "Invalid email address" },
 *     { "field": "password", "message": "Password must be at least 8 characters" }
 *   ],
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { validate, registerSchema } from './validators/authSchemas';
 *
 * router.post('/register', validate(registerSchema), async (req, res) => {
 *   // req.body is now type-safe and validated
 *   const { email, password, role } = req.body;
 *   // ...
 * });
 * ```
 */
export function validate(schema: z.ZodSchema) {
  return (req: unknown, res: unknown, next: unknown): void => {
    const request = req as { body: unknown };
    const response = res as {
      status: (code: number) => {
        json: (data: unknown) => void;
      };
    };
    const nextFn = next as (error?: unknown) => void;

    try {
      const validated = schema.parse(request.body);
      request.body = validated;
      nextFn();
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(422).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
          timestamp: new Date().toISOString(),
        });
      } else {
        nextFn(error);
      }
    }
  };
}
