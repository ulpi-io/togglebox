import Link from 'next/link'

const exampleItems = [
  {
    href: '/examples/feature-toggle',
    title: 'Feature Toggle',
    description: 'Full pattern with loading states, error handling, and fallbacks',
    icon: '🚩',
    features: ['Error boundary', 'Loading skeleton', 'Default fallback', 'User context'],
  },
  {
    href: '/examples/ab-test-cta',
    title: 'A/B Test CTA',
    description: 'Complete A/B test with variant rendering and conversion tracking',
    icon: '🧪',
    features: ['Variant assignment', 'Impression tracking', 'Conversion tracking', 'Metadata display'],
  },
  {
    href: '/examples/config-theme',
    title: 'Config-Driven Theme',
    description: 'Dynamic theming system driven by remote configuration',
    icon: '🎨',
    features: ['CSS variable injection', 'Nested config values', 'Real-time updates', 'Type-safe access'],
  },
  {
    href: '/examples/ssr-hydration',
    title: 'SSR + Hydration',
    description: 'Server-side rendering with seamless client hydration',
    icon: '🖥️',
    features: ['No loading flash', 'SEO-friendly', 'Client-side polling', 'Initial data pass'],
  },
  {
    href: '/examples/polling-updates',
    title: 'Real-time Polling',
    description: 'Live flag and config updates with polling',
    icon: '🔄',
    features: ['Auto-refresh', 'Manual refresh', 'Update listener', 'UI feedback'],
  },
]

export default function ExamplesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <Link href="/" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Examples</h1>
        <p className="text-lg text-gray-600">
          Production-ready patterns with error handling, loading states, and best practices.
        </p>
      </header>

      {/* Feature highlight */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2 text-primary-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="font-medium">Both auth modes shown</span>
        </div>
        <p className="text-sm text-primary-700 mt-1">
          Each example has tabs showing code for both self-hosted (no auth) and cloud (with API key) deployments.
        </p>
      </div>

      {/* Examples list */}
      <div className="space-y-4">
        {exampleItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="group block bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <span className="text-4xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600">
                      {item.title}
                    </h2>
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

      {/* Back to quick start */}
      <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Need the basics?</h3>
        <p className="text-gray-600 mb-4">
          If you&apos;re just getting started, check out the Quick Start examples first.
        </p>
        <Link
          href="/quick"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          View Quick Start
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
