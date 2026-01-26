'use client'

import Link from 'next/link'
import type { Experiment } from '@togglebox/sdk-nextjs'

interface ExperimentCardProps {
  experiment: Experiment
  onStart?: (key: string) => void
  onPause?: (key: string) => void
  onComplete?: (key: string) => void
  canManage?: boolean
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

export function ExperimentCard({
  experiment,
  onStart,
  onPause,
  onComplete,
  canManage = false,
}: ExperimentCardProps) {
  const status = experiment.status || 'draft'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link
            href={`/experiments/${experiment.experimentKey}`}
            className="text-lg font-semibold text-gray-900 hover:text-primary-600"
          >
            {experiment.experimentKey}
          </Link>
          {experiment.description && (
            <p className="text-sm text-gray-500 mt-1">{experiment.description}</p>
          )}
        </div>

        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className="mt-3">
        <h4 className="text-xs font-medium text-gray-500 mb-2">Variations</h4>
        <div className="flex flex-wrap gap-2">
          {experiment.variations.map((variation) => {
            const allocation = experiment.trafficAllocation?.find(
              (t) => t.variationKey === variation.key
            )
            const weight = allocation?.percentage ?? 0
            return (
              <div
                key={variation.key}
                className="px-3 py-1.5 bg-gray-100 rounded text-sm"
              >
                <span className="font-medium">{variation.name || variation.key}</span>
                <span className="text-gray-500 ml-2">{weight}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {canManage && (
        <div className="mt-4 flex gap-2">
          {status === 'draft' && onStart && (
            <button
              onClick={() => onStart(experiment.experimentKey)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Start
            </button>
          )}
          {status === 'running' && onPause && (
            <button
              onClick={() => onPause(experiment.experimentKey)}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
            >
              Pause
            </button>
          )}
          {status === 'paused' && onStart && (
            <button
              onClick={() => onStart(experiment.experimentKey)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Resume
            </button>
          )}
          {(status === 'running' || status === 'paused') && onComplete && (
            <button
              onClick={() => onComplete(experiment.experimentKey)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
