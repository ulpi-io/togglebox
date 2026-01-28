"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getUsersApi } from "@/lib/api/users";
import type { User } from "@/lib/api/types";
import { Badge, Button, Card, CardContent } from "@togglebox/ui";
import { DeleteUserButton } from "@/components/users/delete-user-button";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (pageNum: number) => {
    try {
      setIsLoading(true);
      const result = await getUsersApi({
        limit: PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
      });
      // Handle different API response formats
      const usersList = result?.users ?? (Array.isArray(result) ? result : []);
      const totalCount = result?.total ?? usersList.length;
      setUsers(usersList);
      setTotal(totalCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const result = await getUsersApi({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (isMounted) {
          // Handle different API response formats
          const usersList = result?.users ?? (Array.isArray(result) ? result : []);
          const totalCount = result?.total ?? usersList.length;
          setUsers(usersList);
          setTotal(totalCount);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load users");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const canGoBack = page > 0;
  const canGoForward = page < totalPages - 1;

  const handlePrevPage = () => {
    if (canGoBack) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (canGoForward) setPage((p) => p + 1);
  };

  const handleRefresh = () => {
    loadUsers(page);
  };

  if (isLoading && users.length === 0) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Users</h1>
            <p className="text-muted-foreground">
              Manage user access and permissions
            </p>
          </div>
          <Link href="/users/create">
            <Button>Create User</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="h-5 bg-muted rounded animate-pulse w-48" />
                  <div className="h-5 bg-muted rounded animate-pulse w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Users</h1>
            <p className="text-muted-foreground">
              Manage user access and permissions
            </p>
          </div>
          <Link href="/users/create">
            <Button>Create User</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading users
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Users</h1>
          <p className="text-muted-foreground">
            Manage user access and permissions
            {total > 0 && ` (${total} total)`}
          </p>
        </div>
        <Link href="/users/create">
          <Button>Create User</Button>
        </Link>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-black mb-2">No Users Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first user to get started
            </p>
            <Link href="/users/create">
              <Button>Create User</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-3 px-4 font-black">Email</th>
                    <th className="text-left py-3 px-4 font-black">Role</th>
                    <th className="text-left py-3 px-4 font-black">Created</th>
                    <th className="text-right py-3 px-4 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-black/5 last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          userRole={
                            user.role as
                              | "admin"
                              | "developer"
                              | "editor"
                              | "viewer"
                          }
                          size="sm"
                          className="font-black"
                        >
                          {user.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DeleteUserButton
                          userId={user.id}
                          userEmail={user.email}
                          onSuccess={handleRefresh}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-black/10">
                <div className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={!canGoBack || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!canGoForward || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
