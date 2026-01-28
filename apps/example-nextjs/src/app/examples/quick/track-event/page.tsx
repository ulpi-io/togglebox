'use client'

import { useState } from 'react'
import { useAnalytics } from '@togglebox/sdk-nextjs'

export default function Page() {
  const { trackEvent, trackConversion, flushStats } = useAnalytics()
  const [clicks, setClicks] = useState(0)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const handleClick = () => {
    trackEvent('button_click', { userId: 'user-123' }, {
      properties: { buttonId: 'demo-cta', clickNumber: clicks + 1 },
    })
    setClicks((c) => c + 1)
    setLastAction('Tracked: button_click')
  }

  const handleConversion = async () => {
    await trackConversion('checkout-test', { userId: 'user-123' }, {
      metricName: 'purchase',
      value: 99.99,
    })
    await flushStats()
    setLastAction('Tracked: purchase conversion ($99.99)')
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Event Tracking</h1>

      <div className="max-w-md space-y-4">
        <div className="flex gap-3">
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Track Click ({clicks})
          </button>
          <button
            onClick={handleConversion}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Track Conversion
          </button>
        </div>

        {lastAction && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">{lastAction}</p>
          </div>
        )}
      </div>
    </div>
  )
}
