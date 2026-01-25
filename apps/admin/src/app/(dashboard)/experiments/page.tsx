'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { getExperimentsApi } from '@/lib/api/experiments';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Experiment, User } from '@/lib/api/types';
import { Badge, Button, Card, CardContent } from '@togglebox/ui';
import { ExperimentStatusBadge } from '@/components/experiments/experiment-status-badge';
import { ExperimentActions } from '@/components/experiments/experiment-actions';
import { PlatformEnvFilter, usePlatformEnvFilter } from '@/components/filters/platform-env-filter';
import { ChevronRight, FlaskConical } from 'lucide-react';

function ExperimentsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExperiments = useCallback(async () => {
    if (!platform || !environment) {
      setExperiments([]);
      return;
    }

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

  const hasSelection = platform && environment;

  if (!hasSelection) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <div className="h-5 bg-muted rounded animate-pulse w-32" />
                  <div className="h-5 bg-muted rounded animate-pulse w-16" />
                </div>
                <div className="h-5 bg-muted rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (experiments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🧬</div>
          <h3 className="text-xl font-black mb-2">No Experiments Yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first A/B experiment for {environment}
          </p>
          <Link href={`/platforms/${platform}/environments/${environment}/experiments/create`}>
            <Button>Create Experiment</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/platforms/${platform}/environments/${environment}/experiments/create`}>
          <Button>Create Experiment</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-3 px-4 font-black text-sm">Experiment</th>
                  <th className="text-left py-3 px-4 font-black text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-black text-sm">Variations</th>
                  <th className="text-left py-3 px-4 font-black text-sm">Results</th>
                  <th className="text-right py-3 px-4 font-black text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((experiment) => (
                  <tr
                    key={experiment.experimentKey}
                    className="border-b border-black/5 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/platforms/${platform}/environments/${environment}/experiments/${experiment.experimentKey}`}
                            className="font-semibold text-sm hover:underline"
                          >
                            {experiment.experimentKey}
                          </Link>
                          {experiment.version && (
                            <Badge variant="secondary" size="sm" className="ml-2 font-mono text-xs">
                              v{experiment.version}
                            </Badge>
                          )}
                          {experiment.name && experiment.name !== experiment.experimentKey && (
                            <p className="text-xs text-muted-foreground mt-0.5">{experiment.name}</p>
                          )}
                          {experiment.hypothesis && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
                              {experiment.hypothesis}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <ExperimentStatusBadge status={experiment.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        {experiment.variations.slice(0, 3).map((v) => (
                          <span
                            key={v.key}
                            className={`px-2 py-0.5 text-xs rounded ${
                              v.isControl
                                ? 'bg-info/10 text-info'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {v.name}
                          </span>
                        ))}
                        {experiment.variations.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{experiment.variations.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {experiment.results ? (
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {experiment.results.totalParticipants.toLocaleString()} participants
                            </span>
                            <Badge
                              variant={experiment.results.isSignificant ? 'default' : 'secondary'}
                              size="sm"
                            >
                              {experiment.results.isSignificant ? 'Significant' : 'Collecting'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No data yet</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/platforms/${platform}/environments/${environment}/experiments/${experiment.experimentKey}`}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="View details"
                        >
                          <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <ExperimentActions
                          experiment={experiment}
                          user={user}
                          onSuccess={loadExperiments}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''} · {experiments.filter(e => e.status === 'running').length} running
        </span>
        <Link
          href={`/platforms/${platform}/environments/${environment}/experiments`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Experiments</h1>
        <p className="text-muted-foreground">
          Manage A/B experiments with statistical analysis
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div>Loading...</div>}>
          <PlatformEnvFilter />
        </Suspense>
      </div>

      <Suspense fallback={<div>Loading experiments...</div>}>
        <ExperimentsContent />
      </Suspense>
    </div>
  );
}
