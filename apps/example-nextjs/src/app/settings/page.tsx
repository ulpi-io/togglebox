'use client'

import { hasApiKey } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'
const USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo-user-123'

export default function SettingsPage() {
  const apiKeyConfigured = hasApiKey()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Current environment configuration
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 bg-gray-50 font-medium text-gray-900 w-1/3">
                API URL
              </td>
              <td className="px-6 py-4">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">{API_URL}</code>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 bg-gray-50 font-medium text-gray-900">
                Platform
              </td>
              <td className="px-6 py-4">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">{PLATFORM}</code>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 bg-gray-50 font-medium text-gray-900">
                Environment
              </td>
              <td className="px-6 py-4">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">{ENVIRONMENT}</code>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 bg-gray-50 font-medium text-gray-900">
                Default User ID
              </td>
              <td className="px-6 py-4">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">{USER_ID}</code>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 bg-gray-50 font-medium text-gray-900">
                API Key
              </td>
              <td className="px-6 py-4">
                {apiKeyConfigured ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-700">Configured</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span className="text-yellow-700">Not configured (public mode)</span>
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Environment Variables</h2>
        <p className="text-sm text-blue-700 mb-4">
          Configure these environment variables in <code className="px-1 py-0.5 bg-blue-100 rounded">.env.local</code>:
        </p>
        <pre className="bg-blue-900 text-blue-100 p-4 rounded-lg overflow-auto text-sm">
{`# Required
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_PLATFORM=web
NEXT_PUBLIC_ENVIRONMENT=staging

# Optional
NEXT_PUBLIC_API_KEY=your-api-key-here
NEXT_PUBLIC_USER_ID=demo-user-123`}
        </pre>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Coverage</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <div className="font-medium">Remote Config (Tier 1)</div>
              <div className="text-sm text-gray-500">Fetch and display configurations</div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Available</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <div className="font-medium">Feature Flags (Tier 2)</div>
              <div className="text-sm text-gray-500">List, evaluate, and toggle flags</div>
            </div>
            <span className={`px-2 py-1 rounded text-sm ${apiKeyConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {apiKeyConfigured ? 'Full Access' : 'Read-only'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <div className="font-medium">Experiments (Tier 3)</div>
              <div className="text-sm text-gray-500">List, assign, and manage experiments</div>
            </div>
            <span className={`px-2 py-1 rounded text-sm ${apiKeyConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {apiKeyConfigured ? 'Full Access' : 'Read-only'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">Stats & Events</div>
              <div className="text-sm text-gray-500">Send custom analytics events</div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Available</span>
          </div>
        </div>
      </div>
    </div>
  )
}
