import { getApiKeysApi } from '@/lib/api/api-keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateApiKeyDialog } from '@/components/api-keys/create-api-key-dialog';
import { DeleteUserButton } from '@/components/users/delete-user-button';

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const apiKeys = await getApiKeysApi();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access
          </p>
        </div>
        <CreateApiKeyDialog />
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🔑</div>
            <h3 className="text-xl font-black mb-2">No API Keys Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first API key for programmatic access
            </p>
            <CreateApiKeyDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-black mb-2">
                      {apiKey.name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-bold">API Key</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {apiKey.key.substring(0, 20)}...
                    </div>
                  </div>

                  <div>
                    <div className="font-bold">Created</div>
                    <div className="text-muted-foreground">
                      {new Date(apiKey.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold">Created By</div>
                    <div className="text-muted-foreground">{apiKey.createdBy}</div>
                  </div>

                  {apiKey.lastUsed && (
                    <div>
                      <div className="font-bold">Last Used</div>
                      <div className="text-muted-foreground">
                        {new Date(apiKey.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t-2 border-black">
                  <DeleteUserButton userId={apiKey.id} userEmail={apiKey.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
