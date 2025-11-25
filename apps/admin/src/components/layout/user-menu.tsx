'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/api/types';

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutAction();
      router.push('/login');
    } catch (error) {
      setIsLoggingOut(false);
      console.error('Logout failed:', error);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
      >
        <div className="text-left">
          <div className="text-sm font-bold">{user.email}</div>
          <div className="text-xs opacity-70">{user.role}</div>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 border-2 border-black bg-white z-20">
            <div className="p-4 border-b-2 border-black">
              <div className="text-sm font-bold">{user.email}</div>
              <div className="text-xs text-muted-foreground mt-1">Role: {user.role}</div>
              <div className="text-xs text-muted-foreground">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  router.push('/profile');
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black hover:text-white transition-colors"
              >
                Profile Settings
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-3 py-2 text-sm hover:bg-destructive hover:text-white transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
