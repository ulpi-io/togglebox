'use client';

import { cn } from '../utils/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent h-4 w-4', className)}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
