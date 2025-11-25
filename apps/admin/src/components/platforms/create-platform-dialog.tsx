'use client';

import { useActionState, useState } from 'react';
import { createPlatformAction } from '@/actions/platforms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function CreatePlatformDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createPlatformAction, null);

  // Close dialog on success
  if (state?.success && isOpen) {
    setTimeout(() => {
      setIsOpen(false);
    }, 1500);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create Platform
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white max-w-md w-full border-2 border-black">
        <Card>
          <CardHeader>
            <CardTitle>Create Platform</CardTitle>
            <CardDescription>Add a new platform to your configuration</CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Platform Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., web, mobile, api"
                  required
                  disabled={pending}
                />
                {state?.errors?.name && (
                  <p className="text-sm text-destructive">{state.errors.name[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Brief description of this platform"
                  disabled={pending}
                />
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
                {pending ? 'Creating...' : 'Create Platform'}
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
