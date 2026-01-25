import { browserApiClient } from './browser-client';
import type { User } from './types';

export async function getUsersApi(): Promise<User[]> {
  return browserApiClient('/api/v1/internal/users');
}

export async function createUserApi(
  email: string,
  password: string,
  role: 'admin' | 'developer' | 'viewer'
): Promise<User> {
  return browserApiClient('/api/v1/internal/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export async function updateUserRoleApi(userId: string, role: 'admin' | 'developer' | 'viewer'): Promise<User> {
  return browserApiClient(`/api/v1/internal/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function deleteUserApi(userId: string): Promise<void> {
  return browserApiClient(`/api/v1/internal/users/${userId}`, {
    method: 'DELETE',
  });
}
