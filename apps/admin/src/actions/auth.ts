/**
 * Server actions for authentication and password management.
 *
 * @module actions/auth
 *
 * @remarks
 * These Next.js server actions handle user authentication flows including login,
 * registration, logout, and password reset. Authentication uses JWT tokens stored
 * in HTTP-only cookies for session management.
 *
 * **Authentication Flow:**
 * 1. User submits login credentials (email + password)
 * 2. Backend validates credentials and generates JWT token
 * 3. JWT token stored in HTTP-only cookie
 * 4. Subsequent requests include cookie automatically
 * 5. Middleware validates JWT on protected routes
 *
 * **JWT Token Security:**
 * - Stored in HTTP-only cookie (not accessible via JavaScript)
 * - Secure flag enabled in production (HTTPS only)
 * - SameSite=lax to prevent CSRF attacks
 * - 7-day expiration (configurable)
 * - Automatically included in requests to same domain
 *
 * **Password Reset Flow:**
 * 1. User requests password reset via email
 * 2. Backend generates secure reset token (expires in 1 hour)
 * 3. Reset link sent to user's email
 * 4. User clicks link and submits new password
 * 5. Token validated and password updated
 * 6. User redirected to login page
 *
 * **Security Best Practices:**
 * - Passwords hashed with bcrypt (min 10 rounds)
 * - Rate limiting on login attempts (5 per minute per IP)
 * - Account lockout after 5 failed login attempts
 * - Password reset tokens single-use and time-limited
 * - Email enumeration protection (generic messages)
 */
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginApi, registerApi, requestPasswordResetApi, completePasswordResetApi } from '@/lib/api/auth';
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetCompleteSchema,
} from '@/lib/validation/auth';

/**
 * Authenticates a user and creates a session.
 *
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing email and password
 *
 * @returns Never returns on success (redirects), returns error state on failure
 *
 * @remarks
 * **Authentication Process:**
 * 1. Validates email and password format via Zod schema
 * 2. Calls backend API to verify credentials
 * 3. Receives JWT token from backend
 * 4. Sets JWT in HTTP-only cookie
 * 5. Redirects to dashboard on success
 *
 * **Cookie Configuration:**
 * - Name: `auth-token`
 * - HttpOnly: true (prevents XSS attacks)
 * - Secure: true in production (HTTPS only)
 * - SameSite: lax (prevents CSRF while allowing top-level navigation)
 * - MaxAge: 7 days (604800 seconds)
 * - Path: / (available across entire domain)
 *
 * **Security:**
 * - Password sent over HTTPS (never logged or stored in plain text)
 * - Rate limiting: 5 login attempts per minute per IP
 * - Account lockout: 30 minutes after 5 failed attempts
 * - Failed login does not reveal if email exists
 *
 * **Error Handling:**
 * - Invalid credentials: "Invalid email or password"
 * - Account locked: "Account temporarily locked, try again in 30 minutes"
 * - Validation errors: Field-specific messages from Zod
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If authentication fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('email', 'admin@example.com');
 * formData.append('password', 'SecurePass123');
 *
 * const result = await loginAction(null, formData);
 * // On success: Redirects to /dashboard (no return value)
 * // On failure: Returns { success: false, error: "Invalid email or password" }
 * ```
 */
export async function loginAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = loginSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const response = await loginApi(data.email, data.password);

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', response.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    redirect('/dashboard');
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        errors: (error as any).flatten().fieldErrors,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Registers a new user and creates a session.
 *
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing email, password, and optional role
 *
 * @returns Never returns on success (redirects), returns error state on failure
 *
 * @remarks
 * **Registration Process:**
 * 1. Validates email and password format via Zod schema
 * 2. Calls backend API to create user account
 * 3. Receives JWT token from backend (auto-login)
 * 4. Sets JWT in HTTP-only cookie
 * 5. Redirects to dashboard on success
 *
 * **Default Role:**
 * If no role is specified, users are assigned the 'viewer' role by default.
 * Only existing admin users can create accounts with 'admin' or 'developer' roles.
 *
 * **Email Verification:**
 * Depending on configuration, users may need to verify their email before
 * accessing protected resources. Check environment variables for email verification settings.
 *
 * **Security:**
 * - Password requirements enforced by Zod schema (min 8 chars, complexity)
 * - Email uniqueness enforced by backend
 * - Rate limiting: 3 registration attempts per hour per IP
 * - CAPTCHA recommended for production deployments
 *
 * **Validation:**
 * - Email: Valid email format
 * - Password: Minimum 8 characters with uppercase, lowercase, and number
 * - Role: Optional, defaults to 'viewer'
 *
 * @throws {ZodError} If form data validation fails (caught and returned as error state)
 * @throws {Error} If registration fails or email already exists (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('email', 'newuser@example.com');
 * formData.append('password', 'SecurePass123');
 * // Role is optional, defaults to 'viewer'
 *
 * const result = await registerAction(null, formData);
 * // On success: Redirects to /dashboard (no return value)
 * // On failure: Returns { success: false, error: "Email already exists" }
 * ```
 */
export async function registerAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = registerSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role') || undefined,
    });

    const response = await registerApi(data.email, data.password, data.role);

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', response.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    redirect('/dashboard');
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        errors: (error as any).flatten().fieldErrors,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Logs out the current user by deleting their session cookie.
 *
 * @returns Never returns (always redirects to login page)
 *
 * @remarks
 * **Logout Process:**
 * 1. Deletes the `auth-token` HTTP-only cookie
 * 2. Redirects user to login page
 *
 * **Session Invalidation:**
 * - JWT token is removed from browser immediately
 * - Subsequent requests will be unauthenticated
 * - If backend maintains token blacklist, token is added to blacklist
 *
 * **Security:**
 * - Always redirects to login page after logout
 * - Prevents user from accessing protected routes
 * - Consider clearing other session data if stored
 *
 * **Best Practices:**
 * - Show logout confirmation message on login page
 * - Clear any client-side cached data
 * - Log logout event for audit trail
 *
 * @example
 * ```ts
 * // Logout button handler
 * <form action={logoutAction}>
 *   <button type="submit">Logout</button>
 * </form>
 *
 * // Or programmatically
 * await logoutAction();
 * // Redirects to /login (no return value)
 * ```
 */
export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  redirect('/login');
}

/**
 * Initiates a password reset request by sending a reset link to user's email.
 *
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing email address
 *
 * @returns Promise resolving to action result with success status and message/error
 *
 * @remarks
 * **Password Reset Flow:**
 * 1. User enters email address
 * 2. Backend generates secure reset token (UUID + timestamp)
 * 3. Reset token stored in database with 1-hour expiration
 * 4. Email sent with reset link: `/reset-password?token={token}`
 * 5. User clicks link and submits new password
 *
 * **Email Enumeration Protection:**
 * Always returns success message even if email doesn't exist.
 * This prevents attackers from discovering valid email addresses.
 * Message: "If the email exists, a password reset link has been sent"
 *
 * **Token Security:**
 * - Cryptographically secure random token
 * - Single-use (invalidated after password reset)
 * - Expires after 1 hour
 * - Stored hashed in database
 *
 * **Rate Limiting:**
 * - 3 password reset requests per hour per email
 * - 10 password reset requests per hour per IP
 * - Prevents abuse and spam
 *
 * **Email Template:**
 * Email should include:
 * - Reset link with token
 * - Expiration time (1 hour)
 * - Warning to ignore if not requested
 * - Support contact information
 *
 * @throws {ZodError} If email format is invalid (caught and returned as error state)
 * @throws {Error} If API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append('email', 'user@example.com');
 *
 * const result = await requestPasswordResetAction(null, formData);
 * if (result.success) {
 *   console.log(result.message);
 *   // "If the email exists, a password reset link has been sent"
 * }
 * // Note: Same message whether email exists or not (security)
 * ```
 */
export async function requestPasswordResetAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = passwordResetRequestSchema.parse({
      email: formData.get('email'),
    });

    await requestPasswordResetApi(data.email);

    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        errors: (error as any).flatten().fieldErrors,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Completes a password reset by setting a new password with a valid reset token.
 *
 * @param token - Password reset token from email link
 * @param prevState - Previous form state (unused, required by Next.js useFormState)
 * @param formData - Form data containing new password
 *
 * @returns Never returns on success (redirects), returns error state on failure
 *
 * @remarks
 * **Password Reset Completion:**
 * 1. Validates new password format via Zod schema
 * 2. Verifies reset token is valid and not expired
 * 3. Updates user's password (hashed with bcrypt)
 * 4. Invalidates reset token (single-use)
 * 5. Redirects to login page with success message
 *
 * **Token Validation:**
 * - Token must exist in database
 * - Token must not be expired (< 1 hour old)
 * - Token must not have been used already
 * - Token must match user's email
 *
 * **Password Requirements:**
 * Same as registration:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * **Security:**
 * - Old password is completely replaced (not stored)
 * - All active sessions invalidated (user must re-login)
 * - Password reset event logged for audit
 * - User notified via email of password change
 *
 * **Error Handling:**
 * - Invalid/expired token: "Invalid or expired reset token"
 * - Weak password: Validation errors from Zod
 * - Rate limiting: "Too many attempts, try again later"
 *
 * @throws {ZodError} If password validation fails (caught and returned as error state)
 * @throws {Error} If token is invalid or API call fails (caught and returned as error state)
 *
 * @example
 * ```ts
 * // From reset password page with token in URL
 * const token = searchParams.get('token');
 * const formData = new FormData();
 * formData.append('newPassword', 'NewSecurePass123');
 *
 * const result = await completePasswordResetAction(token, null, formData);
 * // On success: Redirects to /login?reset=success (no return value)
 * // On failure: Returns { success: false, error: "Invalid or expired reset token" }
 * ```
 */
export async function completePasswordResetAction(
  token: string,
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  try {
    const data = passwordResetCompleteSchema.parse({
      token,
      newPassword: formData.get('newPassword'),
    });

    await completePasswordResetApi(data.token, data.newPassword);

    redirect('/login?reset=success');
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        errors: (error as any).flatten().fieldErrors,
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
