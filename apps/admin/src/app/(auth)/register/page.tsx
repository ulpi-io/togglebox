"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerApi } from "@/lib/api/auth";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@togglebox/ui";
import { setCookie } from "@/lib/utils/cookies";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await registerApi(name, email, password);
      // Store token in cookie
      setCookie("auth-token", response.token, 7);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create a new account to get started</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>

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
            <p className="text-xs text-muted-foreground">
              Must contain uppercase, lowercase, and number
            </p>
          </div>

          {error && (
            <div className="border-2 border-destructive p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col space-y-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating account..." : "Register"}
          </Button>

          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/login" className="font-bold hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
