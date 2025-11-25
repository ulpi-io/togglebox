import Link from 'next/link';
import { getPlatformsApi } from '@/lib/api/platforms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreatePlatformDialog } from '@/components/platforms/create-platform-dialog';
import { DeletePlatformButton } from '@/components/platforms/delete-platform-button';

export const dynamic = 'force-dynamic';

export default async function PlatformsPage() {
  const platforms = await getPlatformsApi();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Platforms</h1>
          <p className="text-muted-foreground">
            Manage your platforms and their environments
          </p>
        </div>
        <CreatePlatformDialog />
      </div>

      {platforms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-black mb-2">No Platforms Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first platform to get started with ToggleBox
            </p>
            <CreatePlatformDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <Card key={platform.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black mb-1">
                      {platform.name}
                    </CardTitle>
                    {platform.description && (
                      <p className="text-sm text-muted-foreground">
                        {platform.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(platform.createdAt).toLocaleDateString()}
                </div>

                <div className="flex space-x-2 pt-3 border-t-2 border-black">
                  <Link
                    href={`/platforms/${platform.name}`}
                    className="flex-1"
                  >
                    <button className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold">
                      Manage
                    </button>
                  </Link>
                  <DeletePlatformButton platform={platform.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
