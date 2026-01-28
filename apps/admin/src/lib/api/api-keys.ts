import { browserApiClient } from "./browser-client";

export interface ApiKey {
  id: string;
  name: string;
  /** Full plaintext key - only present when key is first created */
  key?: string;
  /** First 8 characters of the key for display */
  keyPrefix: string;
  /** Last 4 characters of the key for identification */
  keyLast4: string;
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
}

export async function getApiKeysApi(): Promise<ApiKey[]> {
  return browserApiClient("/api/v1/internal/api-keys");
}

/** Default permissions for new API keys */
const DEFAULT_API_KEY_PERMISSIONS = [
  "config:read",
  "config:write",
  "config:update",
  "config:delete",
  "cache:invalidate",
];

export async function createApiKeyApi(
  name: string,
  permissions?: string[],
): Promise<ApiKey> {
  return browserApiClient("/api/v1/internal/api-keys", {
    method: "POST",
    body: JSON.stringify({
      name,
      permissions: permissions ?? DEFAULT_API_KEY_PERMISSIONS,
    }),
  });
}

export async function deleteApiKeyApi(keyId: string): Promise<void> {
  return browserApiClient(`/api/v1/internal/api-keys/${keyId}`, {
    method: "DELETE",
  });
}
