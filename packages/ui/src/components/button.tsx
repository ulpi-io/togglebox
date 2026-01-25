'use client';

import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-black text-white border-black hover:bg-gray-800 hover:border-gray-800',
        outline:
          'bg-white text-black border-black/20 hover:bg-black/5 hover:border-black/30',
        secondary:
          'bg-gray-100 text-black border-gray-200 hover:bg-gray-200 hover:border-gray-300',
        destructive:
          'bg-destructive text-white border-destructive hover:bg-destructive/90',
        ghost:
          'border-transparent hover:bg-black/5 hover:border-transparent',
        link: 'border-transparent underline-offset-4 hover:underline text-black',
        glass:
          'bg-white/80 backdrop-blur-sm border-black/10 hover:bg-black/5 shadow-glass hover:shadow-glass-lg',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
