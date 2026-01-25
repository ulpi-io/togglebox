'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { getExperimentApi, getExperimentResultsApi } from '@/lib/api/experiments';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Experiment, ExperimentResults, User } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@togglebox/ui';
import { ExperimentStatusBadge } from '@/components/experiments/experiment-status-badge';
import { ExperimentActions } from '@/components/experiments/experiment-actions';
import { ExperimentResultsDisplay } from '@/components/experiments/experiment-results';

interface ExperimentDetailPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    experimentKey: string;
  }>;
}

/**
 * Experiment Detail Page - Three-Tier Architecture Tier 3
 * Displays experiment details, variations, and statistical results.
 */
export default function ExperimentDetailPage({ params }: ExperimentDetailPageProps) {
  const { platform, environment, experimentKey } = use(params);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExperiment = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getExperimentApi(platform, environment, experimentKey);
      setExperiment(data);

      // Load results if experiment is running, paused, or completed
      if (data.status === 'running' || data.status === 'paused' || data.status === 'completed') {
        try {
          const resultsData = await getExperimentResultsApi(platform, environment, experimentKey);
          setResults(resultsData);
        } catch (err) {
          console.error('Failed to load results:', err);
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiment');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment, experimentKey]);

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserApi();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  }, []);

  useEffect(() => {
    loadExperiment();
    loadUser();
  }, [loadExperiment, loadUser]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Loading...</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <Link href={`/platforms/${platform}/environments/${environment}/experiments`}>
            <Button variant="outline">Back to Experiments</Button>
          </Link>
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Error</h1>
            <p className="text-muted-foreground">
              {platform} / {environment}
            </p>
          </div>
          <Link href={`/platforms/${platform}/environments/${environment}/experiments`}>
            <Button variant="outline">Back to Experiments</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading experiment
            </div>
            <p className="text-muted-foreground mb-4">{error || 'Experiment not found'}</p>
            <Button variant="outline" onClick={loadExperiment}>
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
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-4xl font-black">{experiment.experimentKey}</h1>
            <ExperimentStatusBadge status={experiment.status} />
          </div>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <div className="flex space-x-2">
          <ExperimentActions experiment={experiment} user={user} onSuccess={loadExperiment} />
          {experiment.status === 'draft' && (
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
          <Link href={`/platforms/${platform}/environments/${environment}/experiments`}>
            <Button variant="outline">Back to Experiments</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-bold text-sm">Name</div>
              <div className="text-muted-foreground">{experiment.name}</div>
            </div>

            {experiment.description && (
              <div>
                <div className="font-bold text-sm">Description</div>
                <div className="text-muted-foreground">{experiment.description}</div>
              </div>
            )}

            <div className="bg-info/10 border border-info/30 rounded-lg p-3">
              <div className="font-bold text-sm">Hypothesis</div>
              <div className="text-muted-foreground">{experiment.hypothesis}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="font-bold text-sm">Created By</div>
                <div className="text-muted-foreground">{experiment.createdBy || 'Unknown'}</div>
              </div>
              <div>
                <div className="font-bold text-sm">Confidence Level</div>
                <div className="text-muted-foreground">
                  {(experiment.confidenceLevel * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="font-bold text-sm">Created</div>
                <div className="text-muted-foreground">
                  {new Date(experiment.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              {experiment.startedAt && (
                <div>
                  <div className="font-bold text-sm">Started</div>
                  <div className="text-muted-foreground">
                    {new Date(experiment.startedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              )}
              {experiment.completedAt && (
                <div>
                  <div className="font-bold text-sm">Completed</div>
                  <div className="text-muted-foreground">
                    {new Date(experiment.completedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variations Card */}
        <Card>
          <CardHeader>
            <CardTitle>Variations ({experiment.variations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {experiment.variations.map((variation) => {
                const allocation = experiment.trafficAllocation.find(
                  (t) => t.variationKey === variation.key
                );
                return (
                  <div
                    key={variation.key}
                    className={`p-4 rounded-lg border ${
                      variation.isControl
                        ? 'border-info/50 bg-info/10'
                        : 'border-black/10 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-black">{variation.name}</span>
                        {variation.isControl && (
                          <Badge variant="default" size="sm">CONTROL</Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        <span className="font-bold">{allocation?.percentage}%</span> traffic
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-muted-foreground mb-1">Value</div>
                      <pre className="text-xs bg-muted p-2 rounded-lg overflow-x-auto">
                        {JSON.stringify(variation.value, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-info/50 bg-info/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">Primary Metric</span>
                <Badge variant="default" size="sm">PRIMARY</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-bold">Name:</span> {experiment.primaryMetric.name}
                </div>
                <div>
                  <span className="font-bold">Event:</span> {experiment.primaryMetric.eventName}
                </div>
                <div>
                  <span className="font-bold">Type:</span> {experiment.primaryMetric.metricType}
                </div>
                <div>
                  <span className="font-bold">Direction:</span> {experiment.primaryMetric.successDirection}
                </div>
              </div>
            </div>

            {experiment.secondaryMetrics && experiment.secondaryMetrics.length > 0 && (
              <div>
                <div className="font-bold text-sm mb-2">Secondary Metrics</div>
                <div className="space-y-2">
                  {experiment.secondaryMetrics.map((metric) => (
                    <div key={metric.id} className="border border-black/10 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-bold">Name:</span> {metric.name}
                        </div>
                        <div>
                          <span className="font-bold">Event:</span> {metric.eventName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <ExperimentResultsDisplay
          experiment={experiment}
          results={results || {
            status: 'collecting',
            totalParticipants: 0,
            totalConversions: 0,
            isSignificant: false,
            variations: experiment.variations.map(v => ({
              variationKey: v.key,
              participants: 0,
              conversions: 0,
              conversionRate: 0,
              relativeLift: undefined,
              confidenceInterval: undefined,
            })),
            lastUpdatedAt: new Date().toISOString(),
          } as ExperimentResults}
        />
      </div>
    </div>
  );
}
