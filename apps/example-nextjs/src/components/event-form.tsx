'use client'

import { useState } from 'react'

interface EventFormProps {
  defaultUserId?: string
  onSend: (event: {
    eventType: string
    eventName: string
    userId: string
    properties?: Record<string, unknown>
  }) => void
  isLoading?: boolean
}

export function EventForm({
  defaultUserId = 'demo-user-123',
  onSend,
  isLoading = false,
}: EventFormProps) {
  const [eventType, setEventType] = useState('custom')
  const [eventName, setEventName] = useState('')
  const [userId, setUserId] = useState(defaultUserId)
  const [properties, setProperties] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let parsedProperties: Record<string, unknown> | undefined
    if (properties.trim()) {
      try {
        parsedProperties = JSON.parse(properties)
      } catch {
        alert('Invalid JSON in properties field')
        return
      }
    }

    onSend({
      eventType,
      eventName,
      userId,
      properties: parsedProperties,
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Send Event</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            id="eventType"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="custom">Custom</option>
            <option value="page_view">Page View</option>
            <option value="click">Click</option>
            <option value="conversion">Conversion</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div>
          <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
            Event Name
          </label>
          <input
            type="text"
            id="eventName"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., button_clicked, checkout_started"
            required
          />
        </div>

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
            required
          />
        </div>

        <div>
          <label htmlFor="properties" className="block text-sm font-medium text-gray-700 mb-1">
            Properties (JSON, optional)
          </label>
          <textarea
            id="properties"
            value={properties}
            onChange={(e) => setProperties(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            placeholder='{"key": "value", "count": 123}'
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !eventName || !userId}
          className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send Event'}
        </button>
      </form>
    </div>
  )
}
