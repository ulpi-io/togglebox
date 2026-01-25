'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useFlags, useToggleBox } from '@togglebox/sdk-nextjs'
import { FlagCard } from '@/components/flag-card'
import { Loading } from '@/components/loading'
import { toggleFlag, hasApiKey } from '@/lib/api'

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

export default function FlagsPage() {
  const flags = useFlags()
  const { isLoading, refresh } = useToggleBox()
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const canToggle = hasApiKey()

  const handleToggle = async (flagKey: string, enabled: boolean) => {
    setIsToggling(flagKey)
    try {
      await toggleFlag(PLATFORM, ENVIRONMENT, flagKey, enabled)
      toast.success(`Flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle flag')
    } finally {
      setIsToggling(null)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-gray-500 mt-1">
          Tier 2: Two-value flags with country/language targeting
        </p>
      </div>

      {!canToggle && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Public mode:</strong> Toggle actions are disabled. Set{' '}
            <code className="px-1 py-0.5 bg-yellow-100 rounded">NEXT_PUBLIC_API_KEY</code> to enable
            flag management.
          </p>
        </div>
      )}

      {flags.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No feature flags configured</p>
          <p className="text-sm text-gray-400 mt-2">
            Create flags in the admin dashboard to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <FlagCard
              key={flag.flagKey}
              flag={flag}
              onToggle={handleToggle}
              canToggle={canToggle && isToggling !== flag.flagKey}
            />
          ))}
        </div>
      )}
    </div>
  )
}
