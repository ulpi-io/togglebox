'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({ title, defaultOpen = false, children, className }: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn('border-2 border-gray-200', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <span>{title}</span>
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-3 pt-0 border-t border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}

interface CollapsibleTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleTrigger({ isOpen, onToggle, children, className }: CollapsibleTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 text-sm font-medium hover:text-black/70 transition-colors',
        className
      )}
    >
      <ChevronRight
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          isOpen && 'rotate-90'
        )}
      />
      {children}
    </button>
  );
}

interface CollapsibleContentProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleContent({ isOpen, children, className }: CollapsibleContentProps) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200',
        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
