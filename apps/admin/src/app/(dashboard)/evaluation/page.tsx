'use client';

import { useState } from 'react';
import { evaluateFlagAction } from '@/actions/evaluation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function EvaluationPage() {
  const [platform, setPlatform] = useState('');
  const [environment, setEnvironment] = useState('');
  const [flagName, setFlagName] = useState('');
  const [userId, setUserId] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  async function handleEvaluate() {
    if (!platform || !environment || !flagName) {
      setError('Platform, environment, and flag name are required');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      const response = await evaluateFlagAction(platform, environment, flagName, {
        userId: userId || undefined,
        country: country || undefined,
        language: language || undefined,
      });

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'Failed to evaluate feature flag');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate feature flag');
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Flag Evaluation Tester</h1>
        <p className="text-muted-foreground">
          Test how feature flags evaluate for specific user contexts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Context</CardTitle>
            <CardDescription>Enter the context to test flag evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Input
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g., web, mobile"
                disabled={isEvaluating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment *</Label>
              <Input
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g., production, staging"
                disabled={isEvaluating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flagName">Flag Name *</Label>
              <Input
                id="flagName"
                value={flagName}
                onChange={(e) => setFlagName(e.target.value)}
                placeholder="e.g., new_checkout_flow"
                disabled={isEvaluating}
              />
            </div>

            <div className="border-t-2 border-black pt-4 mt-4">
              <p className="text-sm font-bold mb-3">User Context (optional)</p>

              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g., user123"
                  disabled={isEvaluating}
                />
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., US, UK, CA"
                  disabled={isEvaluating}
                />
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., en, es, fr"
                  disabled={isEvaluating}
                />
              </div>
            </div>

            <Button onClick={handleEvaluate} disabled={isEvaluating} className="w-full mt-4">
              {isEvaluating ? 'Evaluating...' : 'Evaluate Flag'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Result</CardTitle>
            <CardDescription>The result of the flag evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !error && (
              <div className="text-center py-12 text-muted-foreground">
                Enter evaluation context and click "Evaluate Flag" to see results
              </div>
            )}

            {error && (
              <div className="border-2 border-destructive p-4">
                <div className="text-sm font-bold text-destructive mb-2">Error</div>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="border-2 border-black p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-black">{result.flagName}</div>
                    <div
                      className={`px-4 py-2 text-lg font-black ${
                        result.enabled ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {result.enabled ? 'ENABLED' : 'DISABLED'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold mb-2">Reason:</div>
                    <p className="text-sm">{result.reason}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <div className="font-bold mb-2">Evaluated Context:</div>
                  <pre className="p-3 bg-gray-50 border-2 border-black font-mono">
                    {JSON.stringify(
                      {
                        platform,
                        environment,
                        flagName,
                        ...(userId && { userId }),
                        ...(country && { country }),
                        ...(language && { language }),
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
