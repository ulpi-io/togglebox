'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useExperiment } from '@togglebox/sdk-nextjs'
import { Loading } from '@/components/loading'
import {
  assignExperimentVariation,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  hasApiKey,
} from '@/lib/api'

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'
const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo-user-123'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

export default function ExperimentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const experimentKey = params.experimentKey as string
  const { experiment, isLoading } = useExperiment(experimentKey, { userId: DEFAULT_USER_ID })
  const canManage = hasApiKey()

  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [assignmentResult, setAssignmentResult] = useState<{
    variationKey: string
    variationName: string
  } | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  const handleAssign = async () => {
    setIsAssigning(true)
    try {
      const result = await assignExperimentVariation(
        PLATFORM,
        ENVIRONMENT,
        experimentKey,
        userId
      )
      setAssignmentResult(result.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign variation')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleAction = async (action: 'start' | 'pause' | 'complete') => {
    setIsActioning(true)
    try {
      switch (action) {
        case 'start':
          await startExperiment(PLATFORM, ENVIRONMENT, experimentKey)
          toast.success('Experiment started')
          break
        case 'pause':
          await pauseExperiment(PLATFORM, ENVIRONMENT, experimentKey)
          toast.success('Experiment paused')
          break
        case 'complete':
          await completeExperiment(PLATFORM, ENVIRONMENT, experimentKey)
          toast.success('Experiment completed')
          break
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} experiment`)
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (!experiment) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Experiment Not Found</h2>
        <p className="text-red-600 mb-4">The experiment "{experimentKey}" does not exist.</p>
        <button
          onClick={() => router.push('/experiments')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Back to Experiments
        </button>
      </div>
    )
  }

  const status = experiment.status || 'draft'

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => router.push('/experiments')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          &larr; Back to Experiments
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{experiment.experimentKey}</h1>
            {experiment.description && (
              <p className="text-gray-500 mt-1">{experiment.description}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Variations</h2>
            <div className="space-y-3">
              {experiment.variations.map((variation) => (
                <div
                  key={variation.variationKey}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {variation.name || variation.variationKey}
                    </div>
                    <div className="text-sm text-gray-500">
                      Key: <code>{variation.variationKey}</code>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-primary-600">
                      {variation.weight}%
                    </div>
                    <div className="text-sm text-gray-500">Weight</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="font-medium">
                  {experiment.variations.reduce((sum, v) => sum + v.weight, 0)}%
                </span>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="flex flex-wrap gap-2">
                {status === 'draft' && (
                  <button
                    onClick={() => handleAction('start')}
                    disabled={isActioning}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isActioning ? 'Starting...' : 'Start Experiment'}
                  </button>
                )}
                {status === 'running' && (
                  <>
                    <button
                      onClick={() => handleAction('pause')}
                      disabled={isActioning}
                      className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isActioning ? 'Pausing...' : 'Pause'}
                    </button>
                    <button
                      onClick={() => handleAction('complete')}
                      disabled={isActioning}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isActioning ? 'Completing...' : 'Complete'}
                    </button>
                  </>
                )}
                {status === 'paused' && (
                  <>
                    <button
                      onClick={() => handleAction('start')}
                      disabled={isActioning}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isActioning ? 'Resuming...' : 'Resume'}
                    </button>
                    <button
                      onClick={() => handleAction('complete')}
                      disabled={isActioning}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isActioning ? 'Completing...' : 'Complete'}
                    </button>
                  </>
                )}
                {status === 'completed' && (
                  <p className="text-sm text-gray-500">
                    This experiment has been completed.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Variation</h2>
          <p className="text-sm text-gray-500 mb-4">
            Test how a specific user would be assigned to a variation.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter user ID"
              />
            </div>

            <button
              onClick={handleAssign}
              disabled={isAssigning || !userId}
              className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning ? 'Assigning...' : 'Get Assignment'}
            </button>
          </div>

          {assignmentResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Assignment Result</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Variation Key:</span>
                  <code className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-sm">
                    {assignmentResult.variationKey}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Variation Name:</span>
                  <span className="ml-2 font-medium">{assignmentResult.variationName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
