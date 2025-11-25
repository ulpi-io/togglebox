import Link from 'next/link';
import { getEnvironmentsApi } from '@/lib/api/platforms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateEnvironmentDialog } from '@/components/environments/create-environment-dialog';
import { DeleteEnvironmentButton } from '@/components/environments/delete-environment-button';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PlatformPageProps {
  params: Promise<{
    platform: string;
  }>;
}

export default async function PlatformPage({ params }: PlatformPageProps) {
  const { platform } = await params;
  const environments = await getEnvironmentsApi(platform);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">{platform}</h1>
          <p className="text-muted-foreground">
            Manage environments and configurations for this platform
          </p>
        </div>
        <div className="flex space-x-2">
          <CreateEnvironmentDialog platform={platform} />
          <Link href="/platforms">
            <Button variant="outline">Back to Platforms</Button>
          </Link>
        </div>
      </div>

      {environments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-black mb-2">No Environments Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first environment for {platform}
            </p>
            <CreateEnvironmentDialog platform={platform} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {environments.map((env) => (
            <Card key={env.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black mb-1">
                      {env.name}
                    </CardTitle>
                    {env.description && (
                      <p className="text-sm text-muted-foreground">
                        {env.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(env.createdAt).toLocaleDateString()}
                </div>

                <div className="space-y-2 pt-3 border-t-2 border-black">
                  <Link
                    href={`/platforms/${platform}/environments/${env.name}/configs`}
                    className="block"
                  >
                    <button className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold">
                      Configurations
                    </button>
                  </Link>
                  <Link
                    href={`/platforms/${platform}/environments/${env.name}/flags`}
                    className="block"
                  >
                    <button className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold">
                      Feature Flags
                    </button>
                  </Link>
                  <div className="flex justify-end pt-2">
                    <DeleteEnvironmentButton
                      platform={platform}
                      environment={env.name}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
