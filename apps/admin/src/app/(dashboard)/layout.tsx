import { requireAuth } from '@/lib/auth/session';
import { UserMenu } from '@/components/layout/user-menu';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
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

  const user: User = {
    id: session.userId,
    email: session.email,
    role: session.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar user={user} />
            <Link href="/dashboard" className="flex items-center gap-2">
              <h1 className="text-xl font-bold hover:opacity-70 transition-opacity">
                ToggleBox
              </h1>
            </Link>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar user={user} className="hidden lg:flex" />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
