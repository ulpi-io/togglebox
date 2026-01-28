"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { createApiKeyApi } from "@/lib/api/api-keys";
import {
  Button,
  Input,
  Label,
  Alert,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@togglebox/ui";

interface ApiKeyResult {
  apiKey?: string;
}

interface CreateApiKeyDialogProps {
  onSuccess?: () => void;
}

export function CreateApiKeyDialog({ onSuccess }: CreateApiKeyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiKeyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      const apiKey = await createApiKeyApi(name);
      setResult({ apiKey: apiKey.key });
      // Don't call onSuccess here - wait until user clicks "Done"
      // so they have a chance to copy the key first
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    // If closing and we have a result, refresh the list
    if (!newOpen && result?.apiKey) {
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    }
    // Reset state when opening or closing
    setError(null);
    setResult(null);
    setCopied(false);
    setOpen(newOpen);
  }

  async function handleCopy() {
    if (result?.apiKey) {
      await navigator.clipboard.writeText(result.apiKey);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create API Key</Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for programmatic access
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Production Server, CI/CD Pipeline"
                required
                disabled={isLoading || !!result?.apiKey}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this API key
              </p>
            </div>

            {error && <Alert variant="destructive">{error}</Alert>}

            {result?.apiKey && (
              <div className="glass-card p-4 space-y-3">
                <div className="font-semibold text-sm">Copy this key now!</div>
                <p className="text-xs text-muted-foreground">
                  This key will only be shown once. Store it securely.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg font-mono text-xs break-all border border-black/10">
                    {result.apiKey}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            {!result?.apiKey ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create API Key"}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
