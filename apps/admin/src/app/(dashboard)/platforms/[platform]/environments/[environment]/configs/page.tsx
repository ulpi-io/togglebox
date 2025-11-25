import Link from 'next/link';
import { getConfigVersionsApi } from '@/lib/api/configs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateConfigDialog } from '@/components/configs/create-config-dialog';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface ConfigsPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

export default async function ConfigsPage({ params }: ConfigsPageProps) {
  const { platform, environment } = await params;
  const versions = await getConfigVersionsApi(platform, environment);

  // Sort by version descending (latest first)
  const sortedVersions = [...versions].sort((a, b) => {
    const versionA = a.version.split('.').map(Number);
    const versionB = b.version.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (versionB[i] !== versionA[i]) {
        return versionB[i] - versionA[i];
      }
    }
    return 0;
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Configurations</h1>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          <CreateConfigDialog platform={platform} environment={environment} />
          <Link href={`/platforms/${platform}`}>
            <Button variant="outline">Back to {platform}</Button>
          </Link>
        </div>
      </div>

      {sortedVersions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-xl font-black mb-2">No Configurations Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first configuration version for {environment}
            </p>
            <CreateConfigDialog platform={platform} environment={environment} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedVersions.map((version) => (
            <Card key={version.version}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-2xl font-black">
                        v{version.version}
                      </CardTitle>
                      {version.isStable && (
                        <span className="px-3 py-1 bg-black text-white text-xs font-black">
                          STABLE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Deployed {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-bold mb-2">Configuration:</div>
                  <pre className="p-4 bg-gray-50 border-2 border-black overflow-x-auto text-xs font-mono">
                    {JSON.stringify(version.config, null, 2)}
                  </pre>
                </div>

                <div className="flex space-x-2 pt-3 border-t-2 border-black">
                  <Link
                    href={`/platforms/${platform}/environments/${environment}/configs/${version.version}`}
                    className="flex-1"
                  >
                    <button className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold">
                      View Details
                    </button>
                  </Link>
                  {!version.isStable && (
                    <button className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold">
                      Mark Stable
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
