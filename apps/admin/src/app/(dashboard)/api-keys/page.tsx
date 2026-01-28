"use client";

import { useState, useEffect } from "react";
import { getApiKeysApi, type ApiKey } from "@/lib/api/api-keys";
import { Badge, Button, Card, CardContent } from "@togglebox/ui";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
import { DeleteApiKeyButton } from "@/components/api-keys/delete-api-key-button";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const data = await getApiKeysApi();
      setApiKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access
          </p>
        </div>
        <CreateApiKeyDialog onSuccess={loadApiKeys} />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div className="h-5 bg-muted rounded animate-pulse w-32" />
                    <div className="h-5 bg-muted rounded animate-pulse w-24" />
                  </div>
                  <div className="h-5 bg-muted rounded animate-pulse w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading API keys
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadApiKeys}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🔑</div>
            <h3 className="text-xl font-black mb-2">No API Keys Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first API key for programmatic access
            </p>
            <CreateApiKeyDialog onSuccess={loadApiKeys} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-3 px-4 font-black">Name</th>
                    <th className="text-left py-3 px-4 font-black">Key</th>
                    <th className="text-left py-3 px-4 font-black">Created</th>
                    <th className="text-left py-3 px-4 font-black">
                      Last Used
                    </th>
                    <th className="text-right py-3 px-4 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((apiKey) => (
                    <tr
                      key={apiKey.id}
                      className="border-b border-black/5 last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{apiKey.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {apiKey.createdBy}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {apiKey.keyPrefix}...{apiKey.keyLast4}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(apiKey.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {apiKey.lastUsed ? (
                          new Date(apiKey.lastUsed).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground/50">
                            Never
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DeleteApiKeyButton
                          keyId={apiKey.id}
                          keyName={apiKey.name}
                          onSuccess={loadApiKeys}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
