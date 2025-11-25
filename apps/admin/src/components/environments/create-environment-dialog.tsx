'use client';

import { useActionState, useState } from 'react';
import { createEnvironmentAction } from '@/actions/environments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateEnvironmentDialogProps {
  platform: string;
}

export function CreateEnvironmentDialog({ platform }: CreateEnvironmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return createEnvironmentAction(platform, prevState, formData);
    },
    null
  );

  // Close dialog on success
  if (state?.success && isOpen) {
    setTimeout(() => {
      setIsOpen(false);
    }, 1500);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create Environment
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white max-w-md w-full border-2 border-black">
        <Card>
          <CardHeader>
            <CardTitle>Create Environment</CardTitle>
            <CardDescription>
              Add a new environment to {platform}
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Environment Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., production, staging, development"
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
                  placeholder="Brief description of this environment"
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
                {pending ? 'Creating...' : 'Create Environment'}
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
