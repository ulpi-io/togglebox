'use client';

import { useActionState, useState } from 'react';
import { createConfigVersionAction } from '@/actions/configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { JsonEditor } from './json-editor';

interface CreateConfigDialogProps {
  platform: string;
  environment: string;
}

export function CreateConfigDialog({ platform, environment }: CreateConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [configJson, setConfigJson] = useState('{}');
  const [isStable, setIsStable] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return createConfigVersionAction(platform, environment, prevState, formData);
    },
    null
  );

  // Close dialog on success
  if (state?.success && isOpen) {
    setTimeout(() => {
      setIsOpen(false);
      setConfigJson('{}');
      setIsStable(false);
    }, 1500);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create Version
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white max-w-4xl w-full border-2 border-black m-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Configuration Version</CardTitle>
            <CardDescription>
              Deploy a new configuration for {platform} / {environment}
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  name="version"
                  placeholder="e.g., 1.0.0"
                  required
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Use semantic versioning (e.g., 1.0.0, 1.2.3)
                </p>
                {state?.errors?.version && (
                  <p className="text-sm text-destructive">{state.errors.version[0]}</p>
                )}
              </div>

              <JsonEditor
                name="config"
                value={configJson}
                onChange={setConfigJson}
                disabled={pending}
              />

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isStable"
                  name="isStable"
                  checked={isStable}
                  onChange={(e) => setIsStable(e.target.checked)}
                  disabled={pending}
                  className="w-4 h-4 border-2 border-black"
                  value="true"
                />
                <Label htmlFor="isStable" className="cursor-pointer">
                  Mark as stable (recommended for production)
                </Label>
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
                {pending ? 'Creating...' : 'Create Version'}
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
