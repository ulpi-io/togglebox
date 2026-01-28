import Link from 'next/link'

const quickExamples = [
  { href: '/examples/quick/use-config', title: 'Use Config', description: 'Read remote configuration values', icon: '📋' },
  { href: '/examples/quick/use-flag', title: 'Use Flag', description: 'Check feature flags with user context', icon: '🚩' },
  { href: '/examples/quick/use-experiment', title: 'Use Experiment', description: 'Get A/B test variant assignments', icon: '🧪' },
  { href: '/examples/quick/track-event', title: 'Track Event', description: 'Track events and conversions', icon: '📊' },
  { href: '/examples/quick/ssr-config', title: 'SSR Config', description: 'Server-side config fetching', icon: '🖥️' },
]

const fullExamples = [
  { href: '/examples/full/feature-toggle', title: 'Feature Toggle', description: 'Full pattern with loading states and error handling', icon: '🔀' },
  { href: '/examples/full/ab-test-cta', title: 'A/B Test CTA', description: 'Complete A/B test with impression and conversion tracking', icon: '🎯' },
  { href: '/examples/full/config-theme', title: 'Config-Driven Theme', description: 'Dynamic theming from remote configuration', icon: '🎨' },
  { href: '/examples/full/error-handling', title: 'Error Handling', description: 'Graceful errors with retry and cached fallback', icon: '⚠️' },
  { href: '/examples/full/polling-updates', title: 'Polling Updates', description: 'Live config and flag updates', icon: '🔄' },
  { href: '/examples/full/ssr-hydration', title: 'SSR + Hydration', description: 'Server-side rendering with client hydration', icon: '⚡' },
]

export default function Page() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">SDK Examples</h1>
        <p className="text-gray-600">Copy-paste ready examples for the ToggleBox SDK.</p>
      </header>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickExamples.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Full Examples</h2>
        <div className="space-y-3">
          {fullExamples.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
