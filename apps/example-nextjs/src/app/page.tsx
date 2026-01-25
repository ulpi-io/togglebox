'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'
import { Loading } from '@/components/loading'

export default function DashboardPage() {
  const { config, flags, experiments, isLoading, error, refresh } = useToggleBox()

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h2>
        <p className="text-red-600 mb-4">{error.message}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          ToggleBox Next.js SDK Example Application
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-3xl font-bold text-primary-600">
            {config ? Object.keys(config).length : 0}
          </div>
          <div className="text-gray-500 mt-1">Config Keys</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-3xl font-bold text-green-600">{flags.length}</div>
          <div className="text-gray-500 mt-1">Feature Flags</div>
          <div className="text-sm text-green-600 mt-2">
            {flags.filter((f) => f.enabled).length} enabled
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-3xl font-bold text-purple-600">{experiments.length}</div>
          <div className="text-gray-500 mt-1">Experiments</div>
          <div className="text-sm text-purple-600 mt-2">
            {experiments.filter((e) => e.status === 'running').length} running
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Flags</h2>
          {flags.length === 0 ? (
            <p className="text-gray-500">No flags configured</p>
          ) : (
            <ul className="space-y-3">
              {flags.slice(0, 5).map((flag) => (
                <li
                  key={flag.flagKey}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-900">{flag.flagKey}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      flag.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Experiments</h2>
          {experiments.length === 0 ? (
            <p className="text-gray-500">No experiments configured</p>
          ) : (
            <ul className="space-y-3">
              {experiments.slice(0, 5).map((exp) => (
                <li
                  key={exp.experimentKey}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-900">{exp.experimentKey}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      exp.status === 'running'
                        ? 'bg-green-100 text-green-700'
                        : exp.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exp.status || 'draft'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Configuration Preview</h2>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-64 text-sm">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  )
}
