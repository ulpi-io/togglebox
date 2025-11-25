import { apiClient } from './client';
import type { AuthResponse, User } from './types';

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  return apiClient('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  password: string,
  role?: 'admin' | 'developer' | 'viewer'
): Promise<AuthResponse> {
  return apiClient('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export async function refreshTokenApi(): Promise<{ token: string }> {
  return apiClient('/api/v1/auth/refresh', {
    method: 'POST',
  });
}

export async function requestPasswordResetApi(email: string): Promise<void> {
  return apiClient('/api/v1/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetTokenApi(token: string): Promise<{ valid: boolean; email: string }> {
  return apiClient('/api/v1/auth/password-reset/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function completePasswordResetApi(token: string, newPassword: string): Promise<void> {
  return apiClient('/api/v1/auth/password-reset/complete', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function getCurrentUserApi(): Promise<User> {
  return apiClient('/api/v1/users/me');
}
