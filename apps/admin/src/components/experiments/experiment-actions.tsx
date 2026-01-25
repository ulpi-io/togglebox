'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  startExperimentApi,
  pauseExperimentApi,
  resumeExperimentApi,
  completeExperimentApi,
} from '@/lib/api/experiments';
import type { Experiment, User } from '@/lib/api/types';
import { Button } from '@togglebox/ui';

interface ExperimentActionsProps {
  experiment: Experiment;
  user: User | null;
  onSuccess?: () => void;
}

export function ExperimentActions({ experiment, user, onSuccess }: ExperimentActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { platform, environment, experimentKey, status } = experiment;

  const handleStart = async () => {
    if (!user?.email) {
      setError('User email not found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await startExperimentApi(platform, environment, experimentKey, user.email);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start experiment');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await pauseExperimentApi(platform, environment, experimentKey);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause experiment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await resumeExperimentApi(platform, environment, experimentKey);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume experiment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user?.email) {
      setError('User email not found');
      return;
    }

    const confirmComplete = window.confirm(
      'Are you sure you want to complete this experiment? This action cannot be undone.'
    );

    if (!confirmComplete) return;

    try {
      setIsLoading(true);
      setError(null);
      await completeExperimentApi(platform, environment, experimentKey, undefined, user.email);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete experiment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end space-y-2">
      <div className="flex space-x-2">
        {status === 'draft' && (
          <Button onClick={handleStart} disabled={isLoading} size="sm">
            {isLoading ? 'Starting...' : 'Start'}
          </Button>
        )}

        {status === 'running' && (
          <>
            <Button onClick={handlePause} disabled={isLoading} variant="outline" size="sm">
              {isLoading ? 'Pausing...' : 'Pause'}
            </Button>
            <Button onClick={handleComplete} disabled={isLoading} size="sm">
              {isLoading ? 'Completing...' : 'Complete'}
            </Button>
          </>
        )}

        {status === 'paused' && (
          <>
            <Button onClick={handleResume} disabled={isLoading} size="sm">
              {isLoading ? 'Resuming...' : 'Resume'}
            </Button>
            <Button onClick={handleComplete} disabled={isLoading} variant="outline" size="sm">
              {isLoading ? 'Completing...' : 'Complete'}
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  );
}
