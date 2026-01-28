import { browserApiClient } from "./browser-client";
import type { AuthResponse, User } from "./types";

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return browserApiClient("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  name: string,
  email: string,
  password: string,
  role?: "admin" | "developer" | "viewer",
): Promise<AuthResponse> {
  return browserApiClient("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function refreshTokenApi(): Promise<{ token: string }> {
  return browserApiClient("/api/v1/auth/refresh", {
    method: "POST",
  });
}

export async function requestPasswordResetApi(email: string): Promise<void> {
  return browserApiClient("/api/v1/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetTokenApi(
  token: string,
): Promise<{ valid: boolean; email: string }> {
  return browserApiClient("/api/v1/auth/password-reset/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function completePasswordResetApi(
  token: string,
  newPassword: string,
): Promise<void> {
  return browserApiClient("/api/v1/auth/password-reset/complete", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function getCurrentUserApi(options?: {
  signal?: AbortSignal;
}): Promise<User> {
  return browserApiClient("/api/v1/users/me", { signal: options?.signal });
}

export async function updateProfileApi(data: { name?: string }): Promise<User> {
  return browserApiClient("/api/v1/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return browserApiClient("/api/v1/users/me/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
