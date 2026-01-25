'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { getExperimentsApi } from '@/lib/api/experiments';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Experiment, User } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@togglebox/ui';
import { ExperimentStatusBadge } from '@/components/experiments/experiment-status-badge';
import { ExperimentActions } from '@/components/experiments/experiment-actions';

interface ExperimentsPageProps {
  params: Promise<{
    platform: string;
    environment: string;
  }>;
}

/**
 * Experiments Page - Three-Tier Architecture Tier 3
 * Displays experiments with multi-variant A/B testing and statistical analysis.
 */
export default function ExperimentsPage({ params }: ExperimentsPageProps) {
  const { platform, environment } = use(params);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const loadExperiments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getExperimentsApi(platform, environment);
      setExperiments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment]);

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserApi();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  }, []);

  useEffect(() => {
    loadExperiments();
    loadUser();
  }, [loadExperiments, loadUser]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Experiments</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/create`}>
              <Button>Create Experiment</Button>
            </Link>
            <Link href={`/platforms/${platform}`}>
              <Button variant="outline">Back to {platform}</Button>
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-48 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-64" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Experiments</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/create`}>
              <Button>Create Experiment</Button>
            </Link>
            <Link href={`/platforms/${platform}`}>
              <Button variant="outline">Back to {platform}</Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading experiments
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadExperiments}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Experiments</h1>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/platforms/${platform}/environments/${environment}/experiments/create`}>
            <Button>Create Experiment</Button>
          </Link>
          <Link href={`/platforms/${platform}`}>
            <Button variant="outline">Back to {platform}</Button>
          </Link>
        </div>
      </div>

      {experiments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🧪</div>
            <h3 className="text-xl font-black mb-2">No Experiments Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first experiment for {environment}
            </p>
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/create`}>
              <Button>Create Experiment</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((experiment) => (
            <Card key={experiment.experimentKey}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/platforms/${platform}/environments/${environment}/experiments/${experiment.experimentKey}`}
                      >
                        <CardTitle className="text-2xl font-black hover:underline cursor-pointer">
                          {experiment.experimentKey}
                        </CardTitle>
                      </Link>
                      <ExperimentStatusBadge status={experiment.status} />
                      {experiment.version && (
                        <Badge variant="secondary" size="sm" className="font-mono">
                          v{experiment.version}
                        </Badge>
                      )}
                    </div>
                    {experiment.name && experiment.name !== experiment.experimentKey && (
                      <p className="text-sm font-medium mt-1">{experiment.name}</p>
                    )}
                    {experiment.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {experiment.description}
                      </p>
                    )}
                  </div>
                  <ExperimentActions
                    experiment={experiment}
                    user={user}
                    onSuccess={loadExperiments}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Hypothesis */}
                <div className="bg-info/10 border border-info/30 rounded-lg p-3">
                  <div className="font-bold text-sm">Hypothesis</div>
                  <div className="text-sm text-muted-foreground">{experiment.hypothesis}</div>
                </div>

                {/* Variations */}
                <div>
                  <div className="font-bold text-sm mb-2">
                    Variations ({experiment.variations.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {experiment.variations.map((variation) => {
                      const allocation = experiment.trafficAllocation.find(
                        (t) => t.variationKey === variation.key
                      );
                      return (
                        <div
                          key={variation.key}
                          className={`p-2 rounded-lg border ${
                            variation.isControl
                              ? 'border-info/50 bg-info/10'
                              : 'border-black/10 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{variation.name}</span>
                            {variation.isControl && (
                              <Badge variant="default" size="sm">CONTROL</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {allocation?.percentage}% traffic
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Metric */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-bold">Primary Metric</div>
                    <div className="text-muted-foreground">{experiment.primaryMetric.name}</div>
                  </div>
                  <div>
                    <div className="font-bold">Confidence Level</div>
                    <div className="text-muted-foreground">
                      {(experiment.confidenceLevel * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Results Summary */}
                {experiment.results && (
                  <div className="border-t border-black/10 pt-3">
                    <div className="font-bold text-sm mb-2">Results</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Participants</div>
                        <div className="font-bold">{experiment.results.totalParticipants.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Conversions</div>
                        <div className="font-bold">{experiment.results.totalConversions.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <div className={`font-bold ${
                          experiment.results.isSignificant ? 'text-success' : 'text-warning'
                        }`}>
                          {experiment.results.isSignificant ? 'Significant' : 'Collecting'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 text-sm border-t border-black/10 pt-3">
                  <div>
                    <div className="font-bold">Created</div>
                    <div className="text-muted-foreground">
                      {new Date(experiment.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {experiment.startedAt && (
                    <div>
                      <div className="font-bold">Started</div>
                      <div className="text-muted-foreground">
                        {new Date(experiment.startedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
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
