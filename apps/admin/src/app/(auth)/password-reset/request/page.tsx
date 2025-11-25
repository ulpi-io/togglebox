'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RequestPasswordResetPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email to receive a password reset link
        </CardDescription>
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

        <CardFooter className="flex-col space-y-4">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-sm text-center">
            <Link href="/login" className="hover:underline">
              Back to login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
