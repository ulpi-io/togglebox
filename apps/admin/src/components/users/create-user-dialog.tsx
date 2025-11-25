'use client';

import { useActionState, useState } from 'react';
import { createUserAction } from '@/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function CreateUserDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createUserAction, null);

  // Close dialog on success
  if (state?.success && isOpen) {
    setTimeout(() => {
      setIsOpen(false);
    }, 1500);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create User
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white max-w-md w-full border-2 border-black">
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
            <CardDescription>Add a new user to ToggleBox</CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                  disabled={pending}
                />
                {state?.errors?.email && (
                  <p className="text-sm text-destructive">{state.errors.email[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Must contain uppercase, lowercase, and number
                </p>
                {state?.errors?.password && (
                  <p className="text-sm text-destructive">{state.errors.password[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  required
                  disabled={pending}
                  className="w-full p-2 border-2 border-black"
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="developer">Developer (Read + Write)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
                {state?.errors?.role && (
                  <p className="text-sm text-destructive">{state.errors.role[0]}</p>
                )}
              </div>

              {state?.error && (
                <div className="border-2 border-destructive p-3">
                  <p className="text-sm text-destructive">{state.error}</p>
                </div>
              )}

              {state?.success && (
                <div className="border-2 border-black p-3">
                  <p className="text-sm">{state.message}</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex space-x-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? 'Creating...' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={pending}
                className="flex-1"
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
