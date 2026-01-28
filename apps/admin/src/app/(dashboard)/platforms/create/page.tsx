"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlatformApi } from "@/lib/api/platforms";
import {
  Button,
  Input,
  Label,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@togglebox/ui";

export default function CreatePlatformPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!name?.trim()) {
      setError("Platform name is required");
      setIsLoading(false);
      return;
    }

    try {
      await createPlatformApi(name.trim(), description.trim() || undefined);
      router.push("/platforms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Create Platform</h1>
            <p className="text-muted-foreground">
              Add a new platform to your configuration
            </p>
          </div>
          <Link href="/platforms">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Platform Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., web, mobile, api"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this platform"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/platforms">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Platform"}
          </Button>
        </div>
      </form>
    </div>
  );
}
