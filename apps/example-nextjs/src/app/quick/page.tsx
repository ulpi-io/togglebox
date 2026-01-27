import Link from 'next/link'

const quickStartItems = [
  {
    href: '/quick/provider-setup',
    title: 'Provider Setup',
    description: 'Configure ToggleBoxProvider in your app',
    icon: '⚙️',
    time: '2 min',
  },
  {
    href: '/quick/use-config',
    title: 'Config Access',
    description: 'Read remote configuration values',
    icon: '📋',
    time: '1 min',
  },
  {
    href: '/quick/use-flag',
    title: 'Feature Flags',
    description: 'Check if a feature flag is enabled',
    icon: '🚩',
    time: '1 min',
  },
  {
    href: '/quick/use-experiment',
    title: 'Experiments',
    description: 'Get A/B test variant assignment',
    icon: '🧪',
    time: '1 min',
  },
  {
    href: '/quick/track-event',
    title: 'Event Tracking',
    description: 'Track custom events and conversions',
    icon: '📊',
    time: '1 min',
  },
  {
    href: '/quick/ssr-config',
    title: 'SSR Config',
    description: 'Fetch config on the server',
    icon: '🖥️',
    time: '2 min',
  },
]

export default function QuickStartPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <Link href="/" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Start</h1>
        <p className="text-lg text-gray-600">
          Minimal code examples to get started quickly. Each example focuses on a single concept.
        </p>
      </header>

      {/* Time estimate */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2 text-blue-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Total time: ~8 minutes</span>
        </div>
        <p className="text-sm text-blue-600 mt-1">
          Work through all examples to understand the core SDK features
        </p>
      </div>

      {/* Examples grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickStartItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{item.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                    {index + 1}. {item.title}
                  </h2>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Next steps */}
      <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Steps</h3>
        <p className="text-gray-600 mb-4">
          After completing the quick start, explore complete examples for production-ready patterns.
        </p>
        <Link
          href="/examples"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          View Complete Examples
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
