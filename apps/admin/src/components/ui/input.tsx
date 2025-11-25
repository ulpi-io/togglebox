import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full border-2 border-black px-3 py-2 bg-white text-black',
          'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'placeholder:text-gray-400',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
