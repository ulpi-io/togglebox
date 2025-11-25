import Link from 'next/link';
import { getFeatureFlagsApi } from '@/lib/api/feature-flags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateFlagDialog } from '@/components/feature-flags/create-flag-dialog';
import { ToggleFlagButton } from '@/components/feature-flags/toggle-flag-button';
import { DeleteFlagButton } from '@/components/feature-flags/delete-flag-button';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface FlagsPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

export default async function FlagsPage({ params }: FlagsPageProps) {
  const { platform, environment } = await params;
  const flags = await getFeatureFlagsApi(platform, environment);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Feature Flags</h1>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          <CreateFlagDialog platform={platform} environment={environment} />
          <Link href={`/platforms/${platform}`}>
            <Button variant="outline">Back to {platform}</Button>
          </Link>
        </div>
      </div>

      {flags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🚩</div>
            <h3 className="text-xl font-black mb-2">No Feature Flags Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first feature flag for {environment}
            </p>
            <CreateFlagDialog platform={platform} environment={environment} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <Card key={flag.flagName}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-2xl font-black">
                        {flag.flagName}
                      </CardTitle>
                      <span
                        className={`px-3 py-1 text-xs font-black ${
                          flag.enabled
                            ? 'bg-black text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {flag.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                      <span className="px-3 py-1 bg-white border-2 border-black text-xs font-black">
                        {flag.rolloutType.toUpperCase()}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {flag.description}
                      </p>
                    )}
                  </div>
                  <ToggleFlagButton
                    platform={platform}
                    environment={environment}
                    flagName={flag.flagName}
                    enabled={flag.enabled}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Rollout Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {flag.rolloutType === 'percentage' && (
                    <div>
                      <div className="font-bold">Rollout Percentage</div>
                      <div className="text-muted-foreground">{flag.rolloutPercentage}%</div>
                    </div>
                  )}

                  {flag.rolloutType === 'targeted' && (
                    <>
                      {flag.targetUserIds && flag.targetUserIds.length > 0 && (
                        <div>
                          <div className="font-bold">Target Users</div>
                          <div className="text-muted-foreground">
                            {flag.targetUserIds.slice(0, 3).join(', ')}
                            {flag.targetUserIds.length > 3 && ` +${flag.targetUserIds.length - 3} more`}
                          </div>
                        </div>
                      )}

                      {flag.excludeUserIds && flag.excludeUserIds.length > 0 && (
                        <div>
                          <div className="font-bold">Exclude Users</div>
                          <div className="text-muted-foreground">
                            {flag.excludeUserIds.slice(0, 3).join(', ')}
                            {flag.excludeUserIds.length > 3 && ` +${flag.excludeUserIds.length - 3} more`}
                          </div>
                        </div>
                      )}

                      {flag.targetCountries && flag.targetCountries.length > 0 && (
                        <div>
                          <div className="font-bold">Target Countries</div>
                          <div className="text-muted-foreground">
                            {flag.targetCountries.join(', ')}
                          </div>
                        </div>
                      )}

                      {flag.targetLanguages && flag.targetLanguages.length > 0 && (
                        <div>
                          <div className="font-bold">Target Languages</div>
                          <div className="text-muted-foreground">
                            {flag.targetLanguages.join(', ')}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <div className="font-bold">Created</div>
                    <div className="text-muted-foreground">
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold">Created By</div>
                    <div className="text-muted-foreground">{flag.createdBy}</div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t-2 border-black">
                  <DeleteFlagButton
                    platform={platform}
                    environment={environment}
                    flagName={flag.flagName}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
