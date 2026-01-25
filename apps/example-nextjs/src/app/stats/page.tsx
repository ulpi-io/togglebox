'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { EventForm } from '@/components/event-form'
import { sendStatsEvents } from '@/lib/api'

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'
const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo-user-123'

interface SentEvent {
  id: string
  eventType: string
  eventName: string
  userId: string
  timestamp: string
  status: 'success' | 'error'
}

export default function StatsPage() {
  const [isSending, setIsSending] = useState(false)
  const [sentEvents, setSentEvents] = useState<SentEvent[]>([])

  const handleSend = async (event: {
    eventType: string
    eventName: string
    userId: string
    properties?: Record<string, unknown>
  }) => {
    setIsSending(true)
    const timestamp = new Date().toISOString()

    try {
      await sendStatsEvents(PLATFORM, ENVIRONMENT, [
        {
          ...event,
          timestamp,
        },
      ])

      setSentEvents((prev) => [
        {
          id: Date.now().toString(),
          ...event,
          timestamp,
          status: 'success',
        },
        ...prev,
      ])

      toast.success('Event sent successfully')
    } catch (err) {
      setSentEvents((prev) => [
        {
          id: Date.now().toString(),
          ...event,
          timestamp,
          status: 'error',
        },
        ...prev,
      ])

      toast.error(err instanceof Error ? err.message : 'Failed to send event')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Stats & Events</h1>
        <p className="text-gray-500 mt-1">
          Send custom events for analytics and experiment tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventForm
          defaultUserId={DEFAULT_USER_ID}
          onSend={handleSend}
          isLoading={isSending}
        />

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sent Events</h2>

          {sentEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No events sent yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-auto">
              {sentEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${
                    event.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{event.eventName}</div>
                      <div className="text-sm text-gray-500">
                        Type: {event.eventType} | User: {event.userId}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        event.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sentEvents.length > 0 && (
            <button
              onClick={() => setSentEvents([])}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear history
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">custom</h3>
            <p className="text-sm text-gray-500 mt-1">
              General purpose events for any custom tracking
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">page_view</h3>
            <p className="text-sm text-gray-500 mt-1">
              Track page views and navigation
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">click</h3>
            <p className="text-sm text-gray-500 mt-1">
              Track user interactions and clicks
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">conversion</h3>
            <p className="text-sm text-gray-500 mt-1">
              Track conversions and goal completions
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
