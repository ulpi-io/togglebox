'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { verifyResetTokenApi } from '@/lib/api/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
  Button,
} from '@togglebox/ui';
import Link from 'next/link';

export default function VerifyResetTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyToken() {
      try {
        const response = await verifyResetTokenApi(token);
        if (response.valid) {
          setVerifying(false);
          // Redirect to complete password reset page
          router.push(`/password-reset/complete/${token}`);
        } else {
          setVerifying(false);
          setError('Invalid or expired reset token');
        }
      } catch (err) {
        setVerifying(false);
        setError(err instanceof Error ? err.message : 'Invalid or expired reset token');
      }
    }

    verifyToken();
  }, [token, router]);

  if (verifying) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Reset Token</CardTitle>
          <CardDescription>Please wait while we verify your reset link...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>This password reset link is invalid or has expired</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-destructive p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <div className="flex flex-col space-y-2">
            <Link href="/password-reset/request">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
