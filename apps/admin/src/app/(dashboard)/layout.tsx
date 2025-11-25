import { requireAuth, type Session } from '@/lib/auth/session';
import { UserMenu } from '@/components/layout/user-menu';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import Link from 'next/link';
import type { User } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  // Convert Session to User type for UserMenu
  const user: User = {
    id: session.userId,
    email: session.email,
    role: session.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/platforms', label: 'Platforms', icon: '🚀' },
    { href: '/evaluation', label: 'Evaluation', icon: '🧪' },
    { href: '/users', label: 'Users', icon: '👥' },
    { href: '/api-keys', label: 'API Keys', icon: '🔑' },
    { href: '/cache', label: 'Cache', icon: '💾' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="border-b-2 border-black p-4 flex items-center justify-between">
        <Link href="/dashboard">
          <h1 className="text-2xl font-black hover:opacity-70 transition-opacity">
            ToggleBox
          </h1>
        </Link>
        <UserMenu user={user} />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r-2 border-black min-h-[calc(100vh-60px)] p-4">
          <nav className="space-y-1">
            <div className="font-black text-xs uppercase tracking-wider mb-4 text-muted-foreground">
              Navigation
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 p-3 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black font-bold"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-8 pt-4 border-t-2 border-black">
            <div className="text-xs text-muted-foreground">
              <div className="font-bold mb-1">Logged in as</div>
              <div className="truncate">{user.email}</div>
              <div className="mt-1 inline-block px-2 py-1 bg-black text-white text-xs font-bold">
                {user.role.toUpperCase()}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-8">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
