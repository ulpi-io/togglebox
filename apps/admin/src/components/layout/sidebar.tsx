'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, Badge } from '@togglebox/ui';
import type { User } from '@/lib/api/types';
import {
  LayoutDashboard,
  Layers,
  Globe,
  Settings,
  Flag,
  FlaskConical,
  TestTube2,
  Users,
  Key,
  Database,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/platforms', label: 'Platforms', icon: <Layers className="h-5 w-5" /> },
  { href: '/environments', label: 'Environments', icon: <Globe className="h-5 w-5" /> },
  { href: '/configs', label: 'Configs', icon: <Settings className="h-5 w-5" /> },
  { href: '/flags', label: 'Feature Flags', icon: <Flag className="h-5 w-5" /> },
  { href: '/experiments', label: 'Experiments', icon: <FlaskConical className="h-5 w-5" /> },
  { href: '/evaluation', label: 'Evaluation', icon: <TestTube2 className="h-5 w-5" /> },
  { href: '/users', label: 'Users', icon: <Users className="h-5 w-5" /> },
  { href: '/api-keys', label: 'API Keys', icon: <Key className="h-5 w-5" /> },
  { href: '/cache', label: 'Cache', icon: <Database className="h-5 w-5" /> },
];

interface SidebarProps {
  user: User;
  className?: string;
}

/**
 * Determines which nav item should be active based on the current pathname.
 * Handles nested routes like /platforms/[platform]/environments/create
 * which should highlight "Environments" not "Platforms".
 */
function getActiveNavHref(pathname: string): string {
  // Check for nested resource paths first (more specific)
  // These patterns appear after /platforms/[platform]/environments/[env]/
  if (pathname.includes('/experiments')) return '/experiments';
  if (pathname.includes('/flags')) return '/flags';
  if (pathname.includes('/configs')) return '/configs';

  // Check for environments (appears after /platforms/[platform]/)
  if (pathname.includes('/environments')) return '/environments';

  // Check for other top-level routes
  if (pathname.startsWith('/evaluation')) return '/evaluation';
  if (pathname.startsWith('/users')) return '/users';
  if (pathname.startsWith('/api-keys')) return '/api-keys';
  if (pathname.startsWith('/cache')) return '/cache';
  if (pathname.startsWith('/dashboard')) return '/dashboard';

  // Default to platforms for /platforms routes without nested resources
  if (pathname.startsWith('/platforms')) return '/platforms';

  return '';
}

export function Sidebar({ user, className }: SidebarProps) {
  const pathname = usePathname();
  const activeHref = getActiveNavHref(pathname);

  return (
    <aside
      className={cn(
        'w-64 glass-sidebar min-h-[calc(100vh-4rem)] flex flex-col',
        className
      )}
    >
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 px-3">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-black/5',
                isActive
                  ? 'bg-black text-white hover:bg-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-black/10">
        <div className="px-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Logged in as</div>
          <div className="text-sm font-medium truncate">{user.email}</div>
          <Badge role={user.role as 'admin' | 'developer' | 'editor' | 'viewer'} size="sm">
            {user.role.toUpperCase()}
          </Badge>
        </div>
      </div>
    </aside>
  );
}

export { navItems };
