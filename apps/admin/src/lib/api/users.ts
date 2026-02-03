import { browserApiClient } from "./browser-client";
import type { User } from "./types";

export interface PaginatedUsers {
  users: User[];
  total: number;
}

export interface GetUsersOptions {
  limit?: number;
  offset?: number;
  role?: string;
}

export async function getUsersApi(
  options?: GetUsersOptions,
): Promise<PaginatedUsers> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  if (options?.role) params.set("role", options.role);

  const queryString = params.toString();
  const url = queryString
    ? `/api/v1/internal/users?${queryString}`
    : "/api/v1/internal/users";

  return browserApiClient<PaginatedUsers>(url);
}

export async function createUserApi(
  name: string,
  email: string,
  password: string,
  role: "admin" | "developer" | "viewer",
): Promise<User> {
  return browserApiClient("/api/v1/internal/users", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function updateUserRoleApi(
  userId: string,
  role: "admin" | "developer" | "viewer",
): Promise<User> {
  return browserApiClient(`/api/v1/internal/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function deleteUserApi(userId: string): Promise<void> {
  return browserApiClient(`/api/v1/internal/users/${userId}`, {
    method: "DELETE",
  });
}
