'use client'

import Link from 'next/link'
import type { Flag } from '@togglebox/sdk-nextjs'

interface FlagCardProps {
  flag: Flag
  onToggle?: (flagKey: string, enabled: boolean) => void
  canToggle?: boolean
}

export function FlagCard({ flag, onToggle, canToggle = false }: FlagCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link
            href={`/flags/${flag.flagKey}`}
            className="text-lg font-semibold text-gray-900 hover:text-primary-600"
          >
            {flag.flagKey}
          </Link>
          {flag.description && (
            <p className="text-sm text-gray-500 mt-1">{flag.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              flag.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {flag.enabled ? 'Enabled' : 'Disabled'}
          </span>

          {canToggle && onToggle && (
            <button
              onClick={() => onToggle(flag.flagKey, !flag.enabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                flag.enabled ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  flag.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-gray-100 rounded">
          Value A: <code>{String(flag.valueA)}</code>
        </span>
        <span className="px-2 py-1 bg-gray-100 rounded">
          Value B: <code>{String(flag.valueB)}</code>
        </span>
        {flag.rolloutEnabled && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
            Rollout: {flag.rolloutPercentageA ?? 100}%
          </span>
        )}
      </div>

      {flag.targeting?.countries && flag.targeting.countries.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Targeting: {flag.targeting.countries.map((t) => `${t.country}→${t.serveValue}`).join('; ')}
        </div>
      )}
    </div>
  )
}
