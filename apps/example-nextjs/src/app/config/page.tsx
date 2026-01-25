'use client'

import { useState, useEffect } from 'react'
import { useConfig } from '@togglebox/sdk-nextjs'
import { ConfigViewer } from '@/components/config-viewer'
import { Loading } from '@/components/loading'
import { getConfigVersions, getConfigVersion } from '@/lib/api'

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

interface ConfigVersion {
  version: string
  isStable: boolean
  createdAt: string
}

export default function ConfigPage() {
  const currentConfig = useConfig()
  const [versions, setVersions] = useState<ConfigVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('stable')
  const [displayedConfig, setDisplayedConfig] = useState<Record<string, unknown> | null>(null)
  const [isStable, setIsStable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVersions() {
      try {
        const response = await getConfigVersions(PLATFORM, ENVIRONMENT)
        setVersions(response.data)
        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions')
        setIsLoading(false)
      }
    }
    loadVersions()
  }, [])

  useEffect(() => {
    if (selectedVersion === 'stable' && currentConfig) {
      setDisplayedConfig(currentConfig)
      setIsStable(true)
    }
  }, [selectedVersion, currentConfig])

  const handleVersionChange = async (version: string) => {
    setSelectedVersion(version)
    if (version === 'stable') {
      setDisplayedConfig(currentConfig)
      setIsStable(true)
      return
    }

    setIsLoading(true)
    try {
      const response = await getConfigVersion(PLATFORM, ENVIRONMENT, version)
      setDisplayedConfig(response.data.config)
      setIsStable(response.data.isStable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Remote Configuration</h1>
        <p className="text-gray-500 mt-1">
          Tier 1: Configuration values that are the same for all users
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
          Select Version
        </label>
        <select
          id="version"
          value={selectedVersion}
          onChange={(e) => handleVersionChange(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="stable">Latest Stable</option>
          {versions.map((v) => (
            <option key={v.version} value={v.version}>
              {v.version} {v.isStable ? '(stable)' : ''}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <ConfigViewer
          config={displayedConfig}
          version={selectedVersion === 'stable' ? 'Latest Stable' : selectedVersion}
          isStable={isStable}
        />
      )}

      {versions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Version</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {versions.map((v) => (
                  <tr key={v.version} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{v.version}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          v.isStable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {v.isStable ? 'Stable' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleVersionChange(v.version)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
