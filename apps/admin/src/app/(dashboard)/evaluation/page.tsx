'use client';

import { useState, useEffect } from 'react';
import { evaluateFlagApi } from '@/lib/api/evaluation';
import { getPlatformsApi, getEnvironmentsApi } from '@/lib/api/platforms';
import { getFlagsApi } from '@/lib/api/flags';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Button,
  Select,
} from '@togglebox/ui';
import type { Platform, Environment, Flag, FlagEvaluationResult } from '@/lib/api/types';

/**
 * Evaluation Page - Three-Tier Architecture Tier 2
 * Test flag evaluation with 2-value model (variant A/B).
 */
export default function EvaluationPage() {
  // Selection states
  const [platform, setPlatform] = useState('');
  const [environment, setEnvironment] = useState('');
  const [flagKey, setFlagKey] = useState('');
  const [userId, setUserId] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');

  // Data states
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);

  // Loading states
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isLoadingFlags, setIsLoadingFlags] = useState(false);

  const [result, setResult] = useState<FlagEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    async function loadPlatforms() {
      try {
        const data = await getPlatformsApi();
        setPlatforms(data);
      } catch (err) {
        console.error('Failed to load platforms:', err);
      } finally {
        setIsLoadingPlatforms(false);
      }
    }
    loadPlatforms();
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (!platform) {
      setEnvironments([]);
      setEnvironment('');
      setFlags([]);
      setFlagKey('');
      return;
    }

    async function loadEnvironments() {
      setIsLoadingEnvironments(true);
      try {
        const data = await getEnvironmentsApi(platform);
        setEnvironments(data);
        setEnvironment('');
        setFlags([]);
        setFlagKey('');
      } catch (err) {
        console.error('Failed to load environments:', err);
        setEnvironments([]);
      } finally {
        setIsLoadingEnvironments(false);
      }
    }
    loadEnvironments();
  }, [platform]);

  // Load flags when environment changes
  useEffect(() => {
    if (!platform || !environment) {
      setFlags([]);
      setFlagKey('');
      return;
    }

    async function loadFlags() {
      setIsLoadingFlags(true);
      try {
        const data = await getFlagsApi(platform, environment);
        setFlags(data);
        setFlagKey('');
      } catch (err) {
        console.error('Failed to load flags:', err);
        setFlags([]);
      } finally {
        setIsLoadingFlags(false);
      }
    }
    loadFlags();
  }, [platform, environment]);

  async function handleEvaluate() {
    if (!platform || !environment || !flagKey) {
      setError('Platform, environment, and flag key are required');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      const response = await evaluateFlagApi(platform, environment, flagKey, {
        userId: userId || undefined,
        country: country || undefined,
        language: language || undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate flag');
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Flag Evaluation Tester</h1>
        <p className="text-muted-foreground">
          Test how flags evaluate for specific user contexts (2-value model)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Context</CardTitle>
            <CardDescription>Select the context to test flag evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={isEvaluating || isLoadingPlatforms}
              >
                <option value="">
                  {isLoadingPlatforms ? 'Loading platforms...' : 'Select a platform'}
                </option>
                {platforms.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment *</Label>
              <Select
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                disabled={isEvaluating || !platform || isLoadingEnvironments}
              >
                <option value="">
                  {!platform
                    ? 'Select a platform first'
                    : isLoadingEnvironments
                      ? 'Loading environments...'
                      : 'Select an environment'}
                </option>
                {environments.map((e) => (
                  <option key={e.environment} value={e.environment}>
                    {e.environment}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flagKey">Flag Key *</Label>
              <Select
                id="flagKey"
                value={flagKey}
                onChange={(e) => setFlagKey(e.target.value)}
                disabled={isEvaluating || !environment || isLoadingFlags}
              >
                <option value="">
                  {!environment
                    ? 'Select an environment first'
                    : isLoadingFlags
                      ? 'Loading flags...'
                      : flags.length === 0
                        ? 'No flags available'
                        : 'Select a flag'}
                </option>
                {flags.map((f) => (
                  <option key={f.flagKey} value={f.flagKey}>
                    {f.flagKey}
                  </option>
                ))}
              </Select>
            </div>

            <div className="border-t border-black/10 pt-4 mt-4">
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

            <Button
              onClick={handleEvaluate}
              disabled={isEvaluating || !platform || !environment || !flagKey}
              className="w-full mt-4"
            >
              {isEvaluating ? 'Evaluating...' : 'Evaluate Flag'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Result</CardTitle>
            <CardDescription>The result of the flag evaluation (2-value model)</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !error && (
              <div className="text-center py-12 text-muted-foreground">
                Select evaluation context and click &quot;Evaluate Flag&quot; to see results
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {result && (
              <div className="space-y-4">
                <div className="border border-black/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-black">{result.flagKey}</div>
                    <Badge
                      variant={result.enabled ? 'default' : 'secondary'}
                      size="lg"
                      className="text-lg font-black"
                    >
                      {result.enabled ? 'ENABLED' : 'DISABLED'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-bold mb-1">Variant</div>
                      <div className={`px-3 py-2 text-center font-black rounded border ${
                        result.variant === 'A' ? 'bg-info/10 border-info/50' : 'bg-success/10 border-success/50'
                      }`}>
                        {result.variant}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold mb-1">Value</div>
                      <div className="px-3 py-2 bg-muted border border-black/10 rounded font-mono">
                        {JSON.stringify(result.value)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold mb-2">Reason:</div>
                    <p className="text-sm">{result.reason}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <div className="font-bold mb-2">Evaluated Context:</div>
                  <pre className="p-3 bg-muted border border-black/10 rounded font-mono">
                    {JSON.stringify(
                      {
                        platform,
                        environment,
                        flagKey,
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
