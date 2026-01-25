'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { getExperimentApi, updateExperimentApi } from '@/lib/api/experiments';
import type { Experiment } from '@/lib/api/types';
import {
  Button,
  Input,
  Label,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@togglebox/ui';

interface EditExperimentPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    experimentKey: string;
  }>;
}

export default function EditExperimentPage({ params }: EditExperimentPageProps) {
  const { platform, environment, experimentKey } = use(params);
  const router = useRouter();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [isLoadingExperiment, setIsLoadingExperiment] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExperiment = useCallback(async () => {
    try {
      setIsLoadingExperiment(true);
      const data = await getExperimentApi(platform, environment, experimentKey);
      setExperiment(data);
      setName(data.name);
      setDescription(data.description || '');
      setHypothesis(data.hypothesis);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load experiment');
    } finally {
      setIsLoadingExperiment(false);
    }
  }, [platform, environment, experimentKey]);

  useEffect(() => {
    loadExperiment();
  }, [loadExperiment]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!name?.trim()) {
      setError('Experiment name is required');
      setIsLoading(false);
      return;
    }

    if (!hypothesis?.trim()) {
      setError('Hypothesis is required');
      setIsLoading(false);
      return;
    }

    try {
      await updateExperimentApi(platform, environment, experimentKey, {
        name: name.trim(),
        description: description.trim() || undefined,
        hypothesis: hypothesis.trim(),
      });

      router.push(`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingExperiment) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Experiment</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !experiment) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Experiment</h1>
          <p className="text-muted-foreground">{platform} / {environment}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading experiment
            </div>
            <p className="text-muted-foreground mb-4">{loadError || 'Experiment not found'}</p>
            <Link href={`/platforms/${platform}/environments/${environment}/experiments`}>
              <Button variant="outline">Back to Experiments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only allow editing draft experiments
  if (experiment.status !== 'draft') {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Experiment</h1>
          <p className="text-muted-foreground">{platform} / {environment}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-warning text-lg font-bold mb-2">
              Cannot Edit Experiment
            </div>
            <p className="text-muted-foreground mb-4">
              Only draft experiments can be edited. This experiment is currently &ldquo;{experiment.status}&rdquo;.
            </p>
            <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`}>
              <Button variant="outline">Back to Experiment</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black">Edit Experiment</h1>
              <Badge variant="secondary">{experiment.status}</Badge>
            </div>
            <p className="text-muted-foreground">
              {platform} / {environment} / {experimentKey}
            </p>
          </div>
          <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Experiment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Read-only field */}
            <div className="space-y-2">
              <Label>Experiment Key (immutable)</Label>
              <Input value={experiment.experimentKey} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Checkout Redesign Test"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this experiment"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hypothesis">Hypothesis *</Label>
              <textarea
                id="hypothesis"
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                placeholder="e.g., Single-page checkout will increase conversions by 15%"
                required
                disabled={isLoading}
                className="w-full p-3 border border-black/20 rounded-lg min-h-[100px] bg-white/80 focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white transition-all duration-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Information about what can't be changed */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Variations, traffic allocation, and metrics cannot be changed after creation.
              Delete and recreate the experiment if you need to change these settings.
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href={`/platforms/${platform}/environments/${environment}/experiments/${experimentKey}`}>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
