'use client'

interface ConfigViewerProps {
  config: Record<string, unknown> | null
  version?: string
  isStable?: boolean
}

export function ConfigViewer({ config, version, isStable }: ConfigViewerProps) {
  if (!config) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-gray-500">
        No configuration loaded
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {(version || isStable !== undefined) && (
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
          {version && (
            <span className="text-sm text-gray-300">
              Version: <code className="text-primary-400">{version}</code>
            </span>
          )}
          {isStable !== undefined && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isStable
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {isStable ? 'Stable' : 'Unstable'}
            </span>
          )}
        </div>
      )}
      <pre className="json-viewer p-4 text-gray-100 overflow-auto max-h-96">
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  )
}
