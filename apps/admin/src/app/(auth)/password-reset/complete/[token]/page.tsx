'use client';

import { useActionState } from 'react';
import { useParams } from 'next/navigation';
import { completePasswordResetAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompletePasswordResetPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, formAction, pending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return completePasswordResetAction(token, prevState, formData);
    },
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Must contain uppercase, lowercase, and number
            </p>
            {state?.errors?.newPassword && (
              <p className="text-sm text-destructive">{state.errors.newPassword[0]}</p>
            )}
          </div>

          {state?.error && (
            <div className="border-2 border-destructive p-3">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Resetting password...' : 'Reset Password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
