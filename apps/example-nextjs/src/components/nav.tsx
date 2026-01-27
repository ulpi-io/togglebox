'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem =
  | { href: string; label: string; icon: string }
  | { label: string; icon: string; children: { href: string; label: string }[] }

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  {
    label: 'Quick Start',
    icon: '⚡',
    children: [
      { href: '/quick', label: 'Overview' },
      { href: '/quick/provider-setup', label: 'Provider Setup' },
      { href: '/quick/use-config', label: 'Config Access' },
      { href: '/quick/use-flag', label: 'Feature Flags' },
      { href: '/quick/use-experiment', label: 'Experiments' },
      { href: '/quick/track-event', label: 'Event Tracking' },
      { href: '/quick/ssr-config', label: 'SSR Config' },
    ],
  },
  {
    label: 'Examples',
    icon: '📚',
    children: [
      { href: '/examples', label: 'Overview' },
      { href: '/examples/feature-toggle', label: 'Feature Toggle' },
      { href: '/examples/ab-test-cta', label: 'A/B Test CTA' },
      { href: '/examples/config-theme', label: 'Config Theme' },
      { href: '/examples/ssr-hydration', label: 'SSR + Hydration' },
      { href: '/examples/polling-updates', label: 'Polling Updates' },
    ],
  },
]

export function Nav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isSectionActive = (children: { href: string }[]) => {
    return children.some(child => isActive(child.href))
  }

  return (
    <nav className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-6">
        <Link href="/" className="block">
          <h1 className="text-xl font-bold text-primary-400">ToggleBox</h1>
          <p className="text-sm text-gray-400">Next.js SDK Examples</p>
        </Link>
      </div>

      <ul className="space-y-1 flex-1">
        {navItems.map((item) => {
          if ('children' in item) {
            const sectionActive = isSectionActive(item.children)
            return (
              <li key={item.label} className="mb-2">
                <div className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                  sectionActive ? 'text-white' : 'text-gray-400'
                }`}>
                  <span>{item.icon}</span>
                  {item.label}
                </div>
                <ul className="ml-6 space-y-1">
                  {item.children.map((child) => {
                    const active = isActive(child.href)
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                            active
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          }

          const active = isActive(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="pt-4 border-t border-gray-800 mt-4">
        <div className="text-xs text-gray-500 space-y-1">
          <p>Platform: {process.env.NEXT_PUBLIC_PLATFORM || 'web'}</p>
          <p>Environment: {process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'}</p>
        </div>
      </div>
    </nav>
  )
}
