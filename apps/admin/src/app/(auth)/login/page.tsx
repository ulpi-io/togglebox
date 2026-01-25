'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginApi } from '@/lib/api/auth';
import {
  Alert,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@togglebox/ui';
import { setCookie } from '@/lib/utils/cookies';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await loginApi(email, password);
      // Store token in cookie
      setCookie('auth-token', response.token, 7);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex-col space-y-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>

          <div className="text-sm text-center space-y-2">
            <div>
              <Link href="/password-reset/request" className="hover:underline">
                Forgot password?
              </Link>
            </div>
            <div>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold hover:underline">
                Register
              </Link>
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
