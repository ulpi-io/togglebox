import { apiClient } from './client';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
}

export async function getApiKeysApi(): Promise<ApiKey[]> {
  return apiClient('/api/v1/internal/api-keys');
}

export async function createApiKeyApi(name: string): Promise<ApiKey> {
  return apiClient('/api/v1/internal/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteApiKeyApi(keyId: string): Promise<void> {
  return apiClient(`/api/v1/internal/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}
