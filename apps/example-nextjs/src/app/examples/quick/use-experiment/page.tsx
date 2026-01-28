'use client'

import { useState, useEffect } from 'react'
import { useExperiment } from '@togglebox/sdk-nextjs'

export default function Page() {
  const { experiment, getVariant, isLoading } = useExperiment('checkout-test', { userId: 'user-123' })
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    if (experiment?.status === 'running') {
      getVariant().then(setVariant)
    }
  }, [experiment, getVariant])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">A/B Experiment</h1>

      <div className="max-w-md space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">checkout-test variant</p>
          <p className="text-lg font-semibold text-blue-700">{variant ?? 'Not assigned'}</p>
        </div>

        {variant === 'variant-a' ? (
          <button className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg">
            One-Click Purchase
          </button>
        ) : variant === 'control' ? (
          <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg">
            Proceed to Checkout
          </button>
        ) : (
          <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
            No experiment running
          </div>
        )}
      </div>
    </div>
  )
}
