import Link from "next/link";

const quickStartItems = [
  {
    href: "/examples/quick/use-config",
    title: "Config Access",
    icon: "📋",
    description: "Read remote config",
  },
  {
    href: "/examples/quick/use-flag",
    title: "Feature Flags",
    icon: "🚩",
    description: "Check flags",
  },
  {
    href: "/examples/quick/use-experiment",
    title: "Experiments",
    icon: "🧪",
    description: "A/B test variants",
  },
  {
    href: "/examples/quick/track-event",
    title: "Event Tracking",
    icon: "📊",
    description: "Track events",
  },
  {
    href: "/examples/quick/ssr-config",
    title: "SSR Config",
    icon: "🖥️",
    description: "Server-side fetch",
  },
];

const exampleItems = [
  {
    href: "/examples/full/feature-toggle",
    title: "Feature Toggle",
    icon: "🚩",
    description: "With loading & errors",
  },
  {
    href: "/examples/full/ab-test-cta",
    title: "A/B Test CTA",
    icon: "🧪",
    description: "Conversion tracking",
  },
  {
    href: "/examples/full/config-theme",
    title: "Config Theme",
    icon: "🎨",
    description: "Dynamic theming",
  },
  {
    href: "/examples/full/ssr-hydration",
    title: "SSR + Hydration",
    icon: "🖥️",
    description: "No loading flash",
  },
  {
    href: "/examples/full/polling-updates",
    title: "Polling Updates",
    icon: "🔄",
    description: "Real-time updates",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ToggleBox SDK Examples
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Copy-paste code snippets for integrating ToggleBox into your Next.js
          application. Each example shows both self-hosted and cloud
          configurations.
        </p>
      </header>

      {/* Auth mode notice */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Authentication</h3>
            <p className="text-sm text-blue-700 mt-1">
              The provider is configured with an API key via{" "}
              <code className="px-1 bg-blue-100 rounded text-xs">
                NEXT_PUBLIC_TOGGLEBOX_API_KEY
              </code>{" "}
              for client-side requests and{" "}
              <code className="px-1 bg-blue-100 rounded text-xs">
                TOGGLEBOX_API_KEY
              </code>{" "}
              for server-side SSR fetches. Run{" "}
              <code className="px-1 bg-blue-100 rounded text-xs">
                pnpm seed
              </code>{" "}
              to generate both automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Start</h2>
            <p className="text-gray-600">
              Minimal examples to get started in 5 minutes
            </p>
          </div>
          <Link
            href="/examples"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            View all
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickStartItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl mb-2">{item.icon}</span>
              <span className="font-medium text-gray-900 group-hover:text-primary-600 text-sm">
                {item.title}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Complete Examples Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Complete Examples
            </h2>
            <p className="text-gray-600">
              Production-ready patterns with best practices
            </p>
          </div>
          <Link
            href="/examples"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            View all
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exampleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
            >
              <span className="text-3xl flex-shrink-0">{item.icon}</span>
              <div>
                <span className="font-medium text-gray-900 group-hover:text-primary-600 block">
                  {item.title}
                </span>
                <span className="text-sm text-gray-500">
                  {item.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              1. Install the SDK
            </h3>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
              npm install @togglebox/sdk-nextjs
            </pre>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              2. Wrap your app
            </h3>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
              {`<ToggleBoxProvider
  platform="your-platform"
  environment="production"
  apiUrl="https://your-api.com"
>
  {children}
</ToggleBoxProvider>`}
            </pre>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href="/examples"
            className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            See full setup guide
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
