'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '/' },
  { href: '/config', label: 'Config', icon: 'C' },
  { href: '/flags', label: 'Flags', icon: 'F' },
  { href: '/experiments', label: 'Experiments', icon: 'E' },
  { href: '/stats', label: 'Stats', icon: 'S' },
  { href: '/server-side', label: 'Server-Side', icon: 'SS' },
  { href: '/isr', label: 'ISR', icon: 'ISR' },
  { href: '/health', label: 'Health', icon: 'H' },
  { href: '/settings', label: 'Settings', icon: '*' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-primary-400">ToggleBox</h1>
        <p className="text-sm text-gray-400">Next.js Example</p>
      </div>

      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-xs font-mono">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto pt-8 border-t border-gray-800 mt-8">
        <div className="text-xs text-gray-500">
          <p>Platform: {process.env.NEXT_PUBLIC_PLATFORM || 'web'}</p>
          <p>Environment: {process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'}</p>
        </div>
      </div>
    </nav>
  )
}
