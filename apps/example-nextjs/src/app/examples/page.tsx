import Link from 'next/link'

/**
 * Examples Index
 *
 * Overview of all SDK examples organized into two categories:
 * - Quick Start: Simple, focused examples (~2 min each)
 * - Full Examples: Production-ready patterns with error handling
 */

const quickExamples = [
  {
    href: '/examples/quick/provider-setup',
    title: 'Provider Setup',
    description: 'Configure ToggleBoxProvider with all options',
    icon: '⚙️',
  },
  {
    href: '/examples/quick/use-config',
    title: 'Use Config',
    description: 'Read remote configuration values',
    icon: '📋',
  },
  {
    href: '/examples/quick/use-flag',
    title: 'Use Flag',
    description: 'Check feature flags with user context',
    icon: '🚩',
  },
  {
    href: '/examples/quick/use-experiment',
    title: 'Use Experiment',
    description: 'Get A/B test variant assignments',
    icon: '🧪',
  },
  {
    href: '/examples/quick/track-event',
    title: 'Track Event',
    description: 'Track events & conversions (client + server)',
    icon: '📊',
  },
  {
    href: '/examples/quick/ssr-config',
    title: 'SSR Config',
    description: 'Server-side config fetching',
    icon: '🖥️',
  },
]

const fullExamples = [
  {
    href: '/examples/full/feature-toggle',
    title: 'Feature Toggle',
    description: 'Full pattern with loading states, error handling, and fallbacks',
    icon: '🔀',
    features: ['Error boundary', 'Loading skeleton', 'Default fallback', 'User context'],
  },
  {
    href: '/examples/full/ab-test-cta',
    title: 'A/B Test CTA',
    description: 'Complete A/B test with variant rendering and conversion tracking',
    icon: '🎯',
    features: ['Variant assignment', 'Impression tracking', 'Conversion tracking', 'Metadata display'],
  },
  {
    href: '/examples/full/config-theme',
    title: 'Config-Driven Theme',
    description: 'Dynamic theming system driven by remote configuration',
    icon: '🎨',
    features: ['CSS variable injection', 'Nested config values', 'Real-time updates', 'Type-safe access'],
  },
  {
    href: '/examples/full/ssr-hydration',
    title: 'SSR + Hydration',
    description: 'Server-side rendering with seamless client hydration',
    icon: '⚡',
    features: ['No loading flash', 'SEO-friendly', 'Client-side polling', 'Initial data pass'],
  },
  {
    href: '/examples/full/polling-updates',
    title: 'Real-time Polling',
    description: 'Live flag and config updates with polling',
    icon: '🔄',
    features: ['Auto-refresh', 'Manual refresh', 'Update listener', 'UI feedback'],
  },
  {
    href: '/examples/full/error-handling',
    title: 'Error Handling',
    description: 'Graceful error handling with retry and cached data fallback',
    icon: '⚠️',
    features: ['Error states', 'Retry button', 'Cache fallback', 'Loading skeleton'],
  },
  {
    href: '/examples/full/health-check',
    title: 'Health Check',
    description: 'API connectivity monitoring with latency tracking',
    icon: '💚',
    features: ['Connection status', 'Latency display', 'Check history', 'Debug info'],
  },
]

export default function ExamplesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <Link href="/" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SDK Examples</h1>
        <p className="text-lg text-gray-600">
          Learn the ToggleBox SDK with copy-paste ready examples.
        </p>
      </header>

      {/* Quick Start Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Start</h2>
            <p className="text-gray-600">Simple, focused examples (~2 min each)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickExamples.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Full Examples Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔧</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Full Examples</h2>
            <p className="text-gray-600">Production-ready patterns with error handling</p>
          </div>
        </div>
        <div className="space-y-4">
          {fullExamples.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                        {item.title}
                      </h3>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
