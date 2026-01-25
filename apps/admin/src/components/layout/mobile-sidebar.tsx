'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import {
  cn,
  Button,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
  SheetClose,
} from '@togglebox/ui';
import { navItems } from './sidebar';
import type { User } from '@/lib/api/types';

interface MobileSidebarProps {
  user: User;
}

export function MobileSidebar({ user }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle className="text-xl font-bold">ToggleBox</SheetTitle>
        </SheetHeader>

        <SheetBody className="flex-1 px-4 py-2">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                      'touch-target',
                      isActive
                        ? 'bg-black text-white'
                        : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </SheetBody>

        <div className="p-4 border-t border-black/10 mt-auto">
          <div className="px-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Logged in as</div>
            <div className="text-sm font-medium truncate">{user.email}</div>
            <Badge role={user.role as 'admin' | 'developer' | 'editor' | 'viewer'} size="sm">
              {user.role.toUpperCase()}
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
