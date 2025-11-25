'use client';

import { useActionState, useState } from 'react';
import { createFeatureFlagAction } from '@/actions/feature-flags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateFlagDialogProps {
  platform: string;
  environment: string;
}

export function CreateFlagDialog({ platform, environment }: CreateFlagDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rolloutType, setRolloutType] = useState<'simple' | 'percentage' | 'targeted'>('simple');
  const [enabled, setEnabled] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return createFeatureFlagAction(platform, environment, prevState, formData);
    },
    null
  );

  // Close dialog on success
  if (state?.success && isOpen) {
    setTimeout(() => {
      setIsOpen(false);
      setRolloutType('simple');
      setEnabled(false);
    }, 1500);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create Feature Flag
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white max-w-2xl w-full border-2 border-black m-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Feature Flag</CardTitle>
            <CardDescription>
              Add a new feature flag for {platform} / {environment}
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flagName">Flag Name</Label>
                <Input
                  id="flagName"
                  name="flagName"
                  placeholder="e.g., new_checkout_flow"
                  required
                  disabled={pending}
                />
                {state?.errors?.flagName && (
                  <p className="text-sm text-destructive">{state.errors.flagName[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Brief description of this feature"
                  disabled={pending}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  name="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={pending}
                  className="w-4 h-4 border-2 border-black"
                  value="true"
                />
                <Label htmlFor="enabled" className="cursor-pointer">
                  Enable immediately
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Rollout Type</Label>
                <select
                  name="rolloutType"
                  value={rolloutType}
                  onChange={(e) => setRolloutType(e.target.value as any)}
                  disabled={pending}
                  className="w-full p-2 border-2 border-black"
                >
                  <option value="simple">Simple (On/Off)</option>
                  <option value="percentage">Percentage Rollout</option>
                  <option value="targeted">Targeted Users/Countries/Languages</option>
                </select>
              </div>

              {rolloutType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="rolloutPercentage">Rollout Percentage</Label>
                  <Input
                    id="rolloutPercentage"
                    name="rolloutPercentage"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="0"
                    disabled={pending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of users who will see this feature (0-100)
                  </p>
                </div>
              )}

              {rolloutType === 'targeted' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="targetUserIds">Target User IDs (comma-separated)</Label>
                    <Input
                      id="targetUserIds"
                      name="targetUserIds"
                      placeholder="user1, user2, user3"
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excludeUserIds">Exclude User IDs (comma-separated)</Label>
                    <Input
                      id="excludeUserIds"
                      name="excludeUserIds"
                      placeholder="user4, user5"
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetCountries">Target Countries (comma-separated)</Label>
                    <Input
                      id="targetCountries"
                      name="targetCountries"
                      placeholder="US, UK, CA"
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetLanguages">Target Languages (comma-separated)</Label>
                    <Input
                      id="targetLanguages"
                      name="targetLanguages"
                      placeholder="en, es, fr"
                      disabled={pending}
                    />
                  </div>
                </>
              )}

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
                {pending ? 'Creating...' : 'Create Flag'}
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
