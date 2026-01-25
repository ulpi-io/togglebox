'use client'

import { useState } from 'react'

interface EvaluateFormProps {
  defaultUserId?: string
  onEvaluate: (context: { userId: string; country: string; language: string }) => void
  isLoading?: boolean
  result?: {
    enabled: boolean
    value: string
    reason: string
  } | null
}

export function EvaluateForm({
  defaultUserId = 'demo-user-123',
  onEvaluate,
  isLoading = false,
  result,
}: EvaluateFormProps) {
  const [userId, setUserId] = useState(defaultUserId)
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onEvaluate({ userId, country, language })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Evaluate Flag</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country (optional)
          </label>
          <input
            type="text"
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., US, CA, UK"
          />
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
            Language (optional)
          </label>
          <input
            type="text"
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., en, es, fr"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !userId}
          className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Evaluating...' : 'Evaluate'}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Result</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Enabled:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  result.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {result.enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Value:</span>{' '}
              <code className="px-2 py-0.5 bg-gray-200 rounded">{result.value}</code>
            </div>
            <div>
              <span className="text-gray-500">Reason:</span>{' '}
              <span className="text-gray-600">{result.reason}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
