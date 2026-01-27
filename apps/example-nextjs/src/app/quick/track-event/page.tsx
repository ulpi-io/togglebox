'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'
import { useState } from 'react'

/**
 * Event Tracking Example
 *
 * Use trackEvent for custom analytics events.
 * Use trackConversion for experiment conversion tracking.
 */
export default function TrackEvent() {
  const { trackEvent, trackConversion } = useToggleBox()
  const [clicks, setClicks] = useState(0)

  const handleButtonClick = () => {
    // Track a custom event
    trackEvent('button_click', { userId: 'user-123' }, {
      properties: {
        buttonId: 'cta-main',
        page: '/pricing',
      },
    })
    setClicks(c => c + 1)
  }

  const handlePurchase = async () => {
    // Track experiment conversion
    await trackConversion('pricing-page', { userId: 'user-123' }, {
      metricName: 'purchase',
      value: 99.99,
    })
    alert('Purchase tracked!')
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-2">Track Custom Event</h2>
        <button
          onClick={handleButtonClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Click Me ({clicks} clicks)
        </button>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-2">Track Conversion</h2>
        <button
          onClick={handlePurchase}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Complete Purchase
        </button>
      </div>
    </div>
  )
}
