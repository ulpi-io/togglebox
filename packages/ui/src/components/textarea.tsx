'use client';

import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-sm',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/40 focus:bg-white',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
          'placeholder:text-muted-foreground',
          'resize-y',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
