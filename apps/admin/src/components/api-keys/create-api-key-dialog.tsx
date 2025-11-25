'use client';

import { useActionState, useState } from 'react';
import { createApiKeyAction } from '@/actions/api-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function CreateApiKeyDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createApiKeyAction, null);

  function handleClose() {
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create API Key
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white max-w-lg w-full border-2 border-black">
        <Card>
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>Generate a new API key for programmatic access</CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Production Server, CI/CD Pipeline"
                  required
                  disabled={pending || state?.success}
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to identify this API key
                </p>
                {state?.errors?.name && (
                  <p className="text-sm text-destructive">{state.errors.name[0]}</p>
                )}
              </div>

              {state?.error && (
                <div className="border-2 border-destructive p-3">
                  <p className="text-sm text-destructive">{state.error}</p>
                </div>
              )}

              {state?.success && state?.apiKey && (
                <div className="border-2 border-black p-4 space-y-3">
                  <div className="font-black text-sm">⚠️ Copy this key now!</div>
                  <p className="text-xs text-muted-foreground">
                    This key will only be shown once. Store it securely.
                  </p>
                  <div className="p-3 bg-gray-50 border-2 border-black font-mono text-xs break-all">
                    {state.apiKey}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (state.apiKey) {
                        navigator.clipboard.writeText(state.apiKey);
                        alert('API key copied to clipboard!');
                      }
                    }}
                    className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex space-x-2">
              {!state?.success ? (
                <>
                  <Button type="submit" disabled={pending} className="flex-1">
                    {pending ? 'Creating...' : 'Create API Key'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={pending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Done
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
