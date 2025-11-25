'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create a new account to get started</CardDescription>
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

          {state?.error && (
            <div className="border-2 border-destructive p-3">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col space-y-4">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating account...' : 'Register'}
          </Button>

          <div className="text-sm text-center">
            Already have an account?{' '}
            <Link href="/login" className="font-bold hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
