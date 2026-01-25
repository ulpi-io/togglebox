'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useExperiments, useToggleBox } from '@togglebox/sdk-nextjs'
import { ExperimentCard } from '@/components/experiment-card'
import { Loading } from '@/components/loading'
import { startExperiment, pauseExperiment, completeExperiment, hasApiKey } from '@/lib/api'

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

export default function ExperimentsPage() {
  const experiments = useExperiments()
  const { isLoading, refresh } = useToggleBox()
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const canManage = hasApiKey()

  const handleStart = async (experimentKey: string) => {
    setActionInProgress(experimentKey)
    try {
      await startExperiment(PLATFORM, ENVIRONMENT, experimentKey)
      toast.success(`Experiment "${experimentKey}" started`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start experiment')
    } finally {
      setActionInProgress(null)
    }
  }

  const handlePause = async (experimentKey: string) => {
    setActionInProgress(experimentKey)
    try {
      await pauseExperiment(PLATFORM, ENVIRONMENT, experimentKey)
      toast.success(`Experiment "${experimentKey}" paused`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pause experiment')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleComplete = async (experimentKey: string) => {
    setActionInProgress(experimentKey)
    try {
      await completeExperiment(PLATFORM, ENVIRONMENT, experimentKey)
      toast.success(`Experiment "${experimentKey}" completed`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete experiment')
    } finally {
      setActionInProgress(null)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Experiments</h1>
        <p className="text-gray-500 mt-1">
          Tier 3: A/B tests with multiple variations and user bucketing
        </p>
      </div>

      {!canManage && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Public mode:</strong> Experiment management actions are disabled. Set{' '}
            <code className="px-1 py-0.5 bg-yellow-100 rounded">NEXT_PUBLIC_API_KEY</code> to enable
            experiment control.
          </p>
        </div>
      )}

      {experiments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No experiments configured</p>
          <p className="text-sm text-gray-400 mt-2">
            Create experiments in the admin dashboard to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((experiment) => (
            <ExperimentCard
              key={experiment.experimentKey}
              experiment={experiment}
              onStart={handleStart}
              onPause={handlePause}
              onComplete={handleComplete}
              canManage={canManage && actionInProgress !== experiment.experimentKey}
            />
          ))}
        </div>
      )}
    </div>
  )
}
